-- نسخة تسمح بالتوثيق الذاتي؛ يتحقق الحارس من كل staff_id داخل السجل (owner_staff_id / executor_staff_id / staff_id)
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
    if not public.core_can('smart_plans:edit') then
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
