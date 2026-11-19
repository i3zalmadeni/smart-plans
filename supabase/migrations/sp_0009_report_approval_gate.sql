-- sp_0009: اعتماد التقرير قبل نشره.
-- كل توثيق تنفيذ (executions بلا type) يحمل data.approved_at / approved_by عند اعتماده.
--  * لا يضع approved_at إلا من يملك smart_plans:approve (المنسق / المدير)، ولا يغيّره غيره.
--  * «يحدث في لبيد» (lb_docs) لا يعرض إلا التقارير المعتمدة.
--  * ترحيل: تقارير البرامج المعتمدة سابقًا تُعدّ معتمدة، فلا يختفي ما نُشر باعتماد صحيح.

create or replace function public.sp_records_guard() returns trigger
language plpgsql set search_path to '' as $$
declare r jsonb; v text; oa text; na text;
begin
  if tg_op = 'DELETE' then
    if not public.core_can('smart_plans:edit') then
      raise exception 'ليست لديك صلاحية الحذف في الخطط الذكية' using errcode = '42501';
    end if;
    return old;
  end if;
  r := new.data;
  if coalesce(r->>'type', '') in ('person', 'person-remove', 'rename') then
    raise exception 'المنفذون يُدارون من النواة الرقمية' using errcode = '23514';
  end if;
  if coalesce(r->>'kind', '') = 'coordinator' then
    if not (public.core_can('smart_plans:edit') or (tg_table_name = 'sp_records' and new.col = 'executions' and public.sp_is_plan_coord_add(r))) then
      raise exception 'ليست لديك صلاحية التعديل في الخطط الذكية' using errcode = '42501';
    end if;
    if jsonb_typeof(r->'fields') = 'object' and (r->'fields') ? 'approved_at' and not public.core_can('smart_plans:approve') then
      raise exception 'الاعتماد يحتاج صلاحية الاعتماد في الخطط الذكية' using errcode = '42501';
    end if;
  else
    if tg_op = 'INSERT' then
      if not (public.core_can('smart_plans:add') or (tg_table_name = 'sp_records' and new.col = 'executions' and public.sp_is_self_execution(r))) then
        raise exception 'ليست لديك صلاحية الإضافة في الخطط الذكية' using errcode = '42501';
      end if;
    end if;
    -- اعتماد تقرير التنفيذ: بصلاحية الاعتماد فقط (إضافةً وتغييرًا وإلغاءً)
    if new.col = 'executions' and coalesce(r->>'type', '') = '' then
      oa := case when tg_op = 'UPDATE' then coalesce(old.data->>'approved_at', '') else '' end;
      na := coalesce(r->>'approved_at', '');
      if (na <> oa or (tg_op = 'UPDATE' and coalesce(old.data->>'approved_by', '') <> coalesce(r->>'approved_by', '')))
         and not public.core_can('smart_plans:approve') then
        raise exception 'اعتماد التقرير يحتاج صلاحية الاعتماد في الخطط الذكية' using errcode = '42501';
      end if;
    end if;
  end if;
  for v in select jsonb_path_query(r, '$.**.owner_staff_id') #>> '{}'
           union select jsonb_path_query(r, '$.**.executor_staff_id') #>> '{}'
           union select jsonb_path_query(r, '$.**.staff_id') #>> '{}' loop
    if v is not null and v <> '' and not exists (select 1 from public.staff_members m where m.id::text = v) then
      raise exception 'المنفذ غير موجود في منسوبي النواة' using errcode = '23503';
    end if;
  end loop;
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  return new;
end $$;

-- ترحيل التقارير القائمة
alter table public.sp_records disable trigger sp_records_guard_t;
update public.sp_records x
   set data = x.data || jsonb_build_object('approved_at', a.at, 'approved_by', 'ترحيل: اعتماد البرنامج السابق')
  from (select r.id, (select e.data->'fields'->>'approved_at'
                        from public.sp_records e
                       where e.col = 'executions' and e.data->>'type' = 'edit' and e.data->>'progId' = r.data->>'programId'
                         and e.data->'fields' ? 'approved_at'
                       order by e.created_at desc limit 1) as at
          from public.sp_records r
         where r.col = 'executions' and coalesce(r.data->>'type', '') = '' and coalesce(r.data->>'approved_at', '') = '') a
 where x.id = a.id and coalesce(a.at, '') <> '';
alter table public.sp_records enable trigger sp_records_guard_t;

-- النشر في «يحدث في لبيد»: المعتمد فقط
create or replace function public.lb_docs(p_limit integer default 12) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('id', r.id, 'at', r.created_at,
      'title', coalesce(nullif(p.name, ''), nullif(r.data ->> 'programName', ''), nullif(r.data ->> 'programCode', ''), left(coalesce(r.data ->> 'description', ''), 70), 'توثيق تنفيذ'),
      'code', r.data ->> 'programCode', 'executor', coalesce(nullif(r.data ->> 'executor', ''), p.owner_name), 'date', r.data ->> 'date',
      'location', r.data ->> 'location', 'participants', r.data ->> 'participants', 'beneficiaries', r.data ->> 'beneficiaries',
      'description', r.data ->> 'description', 'outputs', r.data ->> 'outputs',
      'images', (select coalesce(jsonb_agg(i ->> 'id'), '[]'::jsonb) from jsonb_array_elements(r.data -> 'images') i where i ->> 'id' ~* '\.(png|jpe?g|webp|gif)$'),
      'link', '/smart-plans/') x
    from public.sp_records r left join public.lb_programs() p on p.pid = r.data ->> 'programId'
    where r.col = 'executions' and coalesce(r.data ->> 'type', '') = ''
      and coalesce(r.data ->> 'approved_at', '') <> ''
      and jsonb_typeof(r.data -> 'images') = 'array' and jsonb_array_length(r.data -> 'images') > 0
    order by r.created_at desc limit least(greatest(coalesce(p_limit, 12), 1), 30)) q), '[]'::jsonb);
end $$;
