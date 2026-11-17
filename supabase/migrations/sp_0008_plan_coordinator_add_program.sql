-- sp_0008: يسمح لمسؤول الخطة (المسند إليه كمنسق لها) بإضافة برنامج داخل خطته فقط، دون صلاحية smart_plans:add.
-- الملكية تُقرأ من آخر سجل خطة (plan-add / plan-edit) يحمل owner_staff_id.
create or replace function public.sp_is_my_plan(pid text)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((
    select x.o from (
      select coalesce(r.data->'fields'->>'owner_staff_id', r.data->'plan'->>'owner_staff_id') o, r.created_at
      from public.sp_records r
      where r.col = 'executions' and r.data->>'kind' = 'coordinator'
        and ((r.data->>'type' = 'plan-edit' and r.data->>'planId' = pid and (r.data->'fields') ? 'owner_staff_id')
          or (r.data->>'type' = 'plan-add' and r.data->'plan'->>'id' = pid))
      order by r.created_at desc limit 1) x), '') = coalesce(public.current_staff_id()::text, '#')
$$;
create or replace function public.sp_is_plan_coord_add(d jsonb)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(d->>'kind','') = 'coordinator' and coalesce(d->>'type','') = 'add'
     and (d->'data'->>'plan_id') is not null and public.sp_is_my_plan(d->'data'->>'plan_id')
$$;
revoke all on function public.sp_is_my_plan(text), public.sp_is_plan_coord_add(jsonb) from public;
grant execute on function public.sp_is_my_plan(text), public.sp_is_plan_coord_add(jsonb) to authenticated;

drop policy if exists sp_i on public.sp_records;
create policy sp_i on public.sp_records for insert to authenticated
  with check ((select public.core_can('smart_plans:add'))
    or (col = 'executions' and (public.sp_is_self_execution(data) or public.sp_is_plan_coord_add(data))));

CREATE OR REPLACE FUNCTION public.sp_records_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$
declare r jsonb; v text;
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
    if not (public.core_can('smart_plans:add') or (tg_table_name = 'sp_records' and new.col = 'executions' and public.sp_is_self_execution(r))) then
      raise exception 'ليست لديك صلاحية الإضافة في الخطط الذكية' using errcode = '42501';
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
end $function$;
