-- sp_0006: ربط «مكان التنفيذ» بمرافق النواة، وحجز رسمي معتمد لبرامج مجموعات التعلم المهنية في قاعة التنمية المهنية.
-- لا يعدّل جداول النواة؛ الحجز يُسجَّل في جداول احجز مرفق (fb_*) عبر دالة محمية.

-- قائمة المرافق للاختيار (معلومات عامة عن مرافق المدرسة، تُقرأ حيّة من النواة)
create or replace function public.sp_facilities() returns jsonb
language sql stable security definer set search_path = '' as $f$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'code', f.code, 'name', f.name, 'type', ft.name_ar,
    'building', f.building, 'floor', f.floor, 'room_no', f.room_no, 'capacity', f.capacity,
    'bookable', coalesce(s.is_bookable, false)) order by f.name), '[]'::jsonb)
  from public.facilities f
  left join public.facility_types ft on ft.code = f.type_code
  left join public.fb_facility_settings s on s.facility_id = f.id
  where f.status <> 'closed' $f$;
grant execute on function public.sp_facilities() to anon, authenticated;

-- ربط البرنامج بحجزه (برنامج واحد = حجز واحد فعّال)
create table if not exists public.sp_program_bookings (
  program_ref text primary key,
  booking_id  uuid not null references public.fb_bookings(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.sp_program_bookings enable row level security;
drop policy if exists sp_pb_read on public.sp_program_bookings;
create policy sp_pb_read on public.sp_program_bookings for select to anon, authenticated using (true);
revoke all on public.sp_program_bookings from anon, authenticated;
grant select on public.sp_program_bookings to anon, authenticated;

create or replace function public.sp_can_write() returns boolean
language sql stable security definer set search_path = '' as $f$
  select coalesce(public.is_core_admin(), false) or public.core_can('smart_plans:add') or public.core_can('smart_plans:edit') $f$;

-- حجز (أو تحديث حجز) برنامج في مرفق: معتمد رسميًا فورًا، بحصص المرفق التي يتقاطع معها الوقت.
-- p_community: مجموعة التعلم المرتبطة بالخطة (للتحقق من نوعها وحساب عدد الأعضاء)
create or replace function public.sp_book_program(
  p_ref text, p_facility uuid, p_date date, p_from time, p_to time,
  p_owner uuid default null, p_purpose text default null, p_community uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $f$
declare
  v_me uuid := public.fb_me();
  v_by uuid := coalesce(p_owner, public.fb_me());
  fac public.facilities; fs public.fb_facility_settings;
  v_to time := coalesce(p_to, p_from + interval '45 minutes');
  v_pids uuid[]; v_old uuid; v_bid uuid; v_vis int; v_cap int;
begin
  if not public.sp_can_write() then raise exception 'forbidden'; end if;
  if v_by is null then return jsonb_build_object('ok', false, 'reason', 'no_booker'); end if;
  if p_ref is null or p_facility is null or p_date is null or p_from is null then
    return jsonb_build_object('ok', false, 'reason', 'incomplete');
  end if;
  select * into fac from public.facilities where id = p_facility;
  select * into fs from public.fb_facility_settings where facility_id = p_facility;
  if fac.id is null or fs.facility_id is null or not fs.is_bookable or fac.status = 'closed' then
    return jsonb_build_object('ok', false, 'reason', 'facility_unavailable');
  end if;
  select array_agg(id) into v_pids from public.fb_periods
   where is_bookable and starts_at < v_to and ends_at > p_from;
  if v_pids is null then return jsonb_build_object('ok', false, 'reason', 'no_period'); end if;
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
revoke all on function public.sp_book_program(text, uuid, date, time, time, uuid, text, uuid) from public, anon;
grant execute on function public.sp_book_program(text, uuid, date, time, time, uuid, text, uuid) to authenticated;

-- إلغاء حجز البرنامج (عند حذفه أو نقله إلى مكان لا يُحجز)
create or replace function public.sp_unbook_program(p_ref text) returns void
language plpgsql security definer set search_path = '' as $f$
declare v_old uuid;
begin
  if not public.sp_can_write() then raise exception 'forbidden'; end if;
  select booking_id into v_old from public.sp_program_bookings where program_ref = p_ref;
  if v_old is null then return; end if;
  update public.fb_bookings set status = 'cancelled', decided_by = public.fb_me(), decided_at = now(),
         decision_note = 'إلغاء من الخطط الذكية' where id = v_old and status in ('pending','approved');
  delete from public.sp_program_bookings where program_ref = p_ref;
end $f$;
revoke all on function public.sp_unbook_program(text) from public, anon;
grant execute on function public.sp_unbook_program(text) to authenticated;

-- نوع مجموعة التعلم لخطة مرتبطة بمجتمع (plc = مجموعة تعلم مهنية)
create or replace function public.sp_community_kind(p_community uuid) returns text
language sql stable security definer set search_path = '' as $f$
  select kind from public.pc_communities where id = p_community $f$;
grant execute on function public.sp_community_kind(uuid) to anon, authenticated;
