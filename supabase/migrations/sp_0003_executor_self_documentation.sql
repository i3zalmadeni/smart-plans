-- يسمح لمنسوب النواة النشط بتوثيق تنفيذاته هو فقط (executions بمعرّفه) دون صلاحية smart_plans:add
create or replace function public.sp_is_self_execution(d jsonb)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(d->>'kind','') <> 'coordinator'
     and coalesce(d->>'type','') = ''
     and (d->>'executor_staff_id') is not null
     and (d->>'executor_staff_id') = public.current_staff_id()::text
     and exists (select 1 from public.staff_members m where m.id = public.current_staff_id() and m.is_active)
$$;
grant execute on function public.sp_is_self_execution(jsonb) to authenticated;

drop policy if exists sp_i on public.sp_records;
create policy sp_i on public.sp_records for insert to authenticated
  with check ((select public.core_can('smart_plans:add')) or (col = 'executions' and public.sp_is_self_execution(data)));

drop policy if exists sp_evidence_insert on storage.objects;
create policy sp_evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sp-evidence' and ((select public.core_can('smart_plans:add'))
    or exists (select 1 from public.staff_members m where m.id = public.current_staff_id() and m.is_active)));

create or replace function public.sp_my_access() returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'staff_id', public.current_staff_id(),
    'name', (select m.full_name from public.staff_members m where m.user_id = auth.uid()),
    'executor', exists (select 1 from public.staff_members m where m.user_id = auth.uid() and m.is_active),
    'admin', public.is_core_admin(),
    'view', public.core_can('smart_plans:view'),
    'add', public.core_can('smart_plans:add'),
    'edit', public.core_can('smart_plans:edit'),
    'approve', public.core_can('smart_plans:approve'))
$$;
