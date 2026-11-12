-- sp_0005: منسق الخطط الذكية بنفس صلاحيات مدير النواة داخل نظام الخطط الذكية فقط.
-- من كان دوره coordinator على منصة smart_plans (staff_roles.system_code) يحصل على كل صلاحيات smart_plans:*
-- (اطلاع، إضافة، تعديل/حذف، اعتماد) دون منحها واحدةً واحدة. لا يمتد ذلك إلى أي نظام آخر ولا إلى صلاحيات النواة نفسها.

CREATE OR REPLACE FUNCTION public.is_smart_plans_coordinator()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select exists (select 1 from public.staff_members s join public.staff_roles r on r.staff_id = s.id
    where s.user_id = auth.uid() and s.is_active and s.account_status = 'active'
      and r.role_code = 'coordinator' and r.system_code = 'smart_plans' and r.ended_on is null) $function$;
revoke all on function public.is_smart_plans_coordinator() from public;
grant execute on function public.is_smart_plans_coordinator() to authenticated;

CREATE OR REPLACE FUNCTION public.core_can(p text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select public.is_core_admin()
    or (split_part(p, ':', 1) = 'smart_plans' and public.is_smart_plans_coordinator())
    or exists (
    select 1 from public.staff_members s join public.staff_permissions sp on sp.staff_id = s.id
    where s.user_id = auth.uid() and s.is_active and s.account_status = 'active'
      and sp.permission_code = any (
        case split_part(p, ':', 2)
          when 'view' then array[split_part(p, ':', 1) || ':view', split_part(p, ':', 1) || ':add', split_part(p, ':', 1) || ':edit']
          when 'add'  then array[split_part(p, ':', 1) || ':add', split_part(p, ':', 1) || ':edit']
          else array[p] end)) $function$;

-- للواجهة: إضافة علم coordinator (الفرض الفعلي يبقى في RLS والحارس)
CREATE OR REPLACE FUNCTION public.sp_my_access() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  select jsonb_build_object(
    'staff_id', public.current_staff_id(),
    'name', (select m.full_name from public.staff_members m where m.user_id = auth.uid()),
    'executor', exists (select 1 from public.staff_members m where m.user_id = auth.uid() and m.is_active),
    'admin', public.is_core_admin(),
    'coordinator', public.is_smart_plans_coordinator(),
    'view', public.core_can('smart_plans:view'),
    'add', public.core_can('smart_plans:add'),
    'edit', public.core_can('smart_plans:edit'),
    'approve', public.core_can('smart_plans:approve'))
$$;
