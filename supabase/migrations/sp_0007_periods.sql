-- sp_0007: اختيار الوقت بالحصص (حصص احجز مرفق) بدل الساعة، مع منع التعارض.
create or replace function public.sp_periods() returns jsonb
language sql stable security definer set search_path = '' as $f$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name_ar, 'kind', kind,
    'starts', to_char(starts_at, 'HH24:MI'), 'ends', to_char(ends_at, 'HH24:MI'), 'bookable', is_bookable) order by sort_order), '[]'::jsonb)
  from public.fb_periods $f$;
grant execute on function public.sp_periods() to anon, authenticated;

-- الحصص المحجوزة فعلًا لمرفق في تاريخ (يُستثنى حجز البرنامج نفسه)
create or replace function public.sp_busy_periods(p_facility uuid, p_date date, p_ref text default null) returns text[]
language sql stable security definer set search_path = '' as $f$
  select coalesce(array_agg(p.code), '{}') from public.fb_booking_periods bp
  join public.fb_periods p on p.id = bp.period_id
  where bp.facility_id = p_facility and bp.booking_date = p_date and bp.active
    and bp.booking_id is distinct from (select booking_id from public.sp_program_bookings where program_ref = p_ref) $f$;
grant execute on function public.sp_busy_periods(uuid, date, text) to anon, authenticated;

create or replace function public.sp_book_program_periods(
  p_ref text, p_facility uuid, p_date date, p_codes text[],
  p_owner uuid default null, p_purpose text default null, p_community uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $f$
declare
  v_me uuid := public.fb_me(); v_by uuid := coalesce(p_owner, public.fb_me());
  fac public.facilities; fs public.fb_facility_settings;
  v_pids uuid[]; v_old uuid; v_bid uuid; v_vis int; v_cap int;
begin
  if not public.sp_can_write() then raise exception 'forbidden'; end if;
  if v_by is null then return jsonb_build_object('ok', false, 'reason', 'no_booker'); end if;
  if p_ref is null or p_facility is null or p_date is null or coalesce(cardinality(p_codes), 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'incomplete');
  end if;
  select * into fac from public.facilities where id = p_facility;
  select * into fs from public.fb_facility_settings where facility_id = p_facility;
  if fac.id is null or fs.facility_id is null or not fs.is_bookable or fac.status = 'closed' then
    return jsonb_build_object('ok', false, 'reason', 'facility_unavailable');
  end if;
  select array_agg(id) into v_pids from public.fb_periods where is_bookable and code = any (p_codes);
  if coalesce(cardinality(v_pids), 0) <> (select count(distinct c) from unnest(p_codes) c) then
    return jsonb_build_object('ok', false, 'reason', 'no_period');
  end if;
  v_vis := coalesce((select count(*) from public.pc_community_members where community_id = p_community), 0);
  v_cap := coalesce(fs.max_visitors, fac.capacity);
  v_vis := greatest(1, case when v_cap is null then v_vis else least(v_vis, v_cap) end);
  select booking_id into v_old from public.sp_program_bookings where program_ref = p_ref;
  begin
    if v_old is not null then
      update public.fb_bookings set status = 'cancelled', decided_by = v_me, decided_at = now(),
             decision_note = 'تحديث موعد البرنامج في الخطط الذكية' where id = v_old and status in ('pending','approved');
      delete from public.sp_program_bookings where program_ref = p_ref;
    end if;
    insert into public.fb_bookings (facility_id, booked_by, booking_date, visitors, purpose, status, decided_by, decided_at, decision_note)
    values (p_facility, v_by, p_date, v_vis, nullif(btrim(p_purpose), ''), 'approved', v_me, now(), 'اعتماد تلقائي من الخطط الذكية')
    returning id into v_bid;
    insert into public.fb_booking_periods (booking_id, period_id, facility_id, booking_date)
      select v_bid, x, p_facility, p_date from unnest(v_pids) x;
    insert into public.sp_program_bookings (program_ref, booking_id) values (p_ref, v_bid);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'slot_taken');
  end;
  return jsonb_build_object('ok', true, 'booking_id', v_bid, 'periods', cardinality(v_pids));
end $f$;
revoke all on function public.sp_book_program_periods(text, uuid, date, text[], uuid, text, uuid) from public, anon;
grant execute on function public.sp_book_program_periods(text, uuid, date, text[], uuid, text, uuid) to authenticated;
