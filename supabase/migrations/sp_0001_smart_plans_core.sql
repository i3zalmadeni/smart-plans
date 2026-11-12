-- sp_0001: الخطط الذكية على قاعدة النواة الرقمية (labeedsch_PC). جداول النظام بالبادئة sp_
-- لا يكتب النظام في جداول النواة؛ يربط المنفذين بمعرّف المنسوب staff_members.id داخل السجلات.

create table if not exists public.sp_records (
  id         uuid primary key default gen_random_uuid(),
  col        text not null check (col in ('executions', 'unplanned')),
  data       jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists sp_records_col_idx on public.sp_records (col, created_at);
alter table public.sp_records enable row level security;

-- حارس الكتابة: الصلاحيات من النواة (smart_plans:*) + سلامة ربط المنفذين
create or replace function public.sp_records_guard() returns trigger
language plpgsql set search_path = '' as $$
declare r jsonb; v text;
begin
  if tg_op = 'DELETE' then
    if not public.core_can('smart_plans:edit') then
      raise exception 'ليست لديك صلاحية الحذف في الخطط الذكية' using errcode = '42501';
    end if;
    return old;
  end if;
  r := new.data;
  -- المنفذون يُختارون من منسوبي النواة؛ لا إدارة أسماء محلية
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
    if not public.core_can('smart_plans:add') then
      raise exception 'ليست لديك صلاحية الإضافة في الخطط الذكية' using errcode = '42501';
    end if;
  end if;
  for v in select jsonb_path_query(r, '$.**.owner_staff_id') #>> '{}' union select jsonb_path_query(r, '$.**.executor_staff_id') #>> '{}' loop
    if v is not null and v <> '' and not exists (select 1 from public.staff_members m where m.id::text = v) then
      raise exception 'المنفذ غير موجود في منسوبي النواة' using errcode = '23503';
    end if;
  end loop;
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  return new;
end $$;

drop trigger if exists sp_records_guard_t on public.sp_records;
create trigger sp_records_guard_t before insert or update or delete on public.sp_records
for each row execute function public.sp_records_guard();

drop policy if exists sp_r on public.sp_records;
drop policy if exists sp_i on public.sp_records;
drop policy if exists sp_u on public.sp_records;
drop policy if exists sp_d on public.sp_records;
create policy sp_r on public.sp_records for select to anon, authenticated using (true);
create policy sp_i on public.sp_records for insert to authenticated with check ((select public.core_can('smart_plans:add')));
create policy sp_u on public.sp_records for update to authenticated using ((select public.core_can('smart_plans:edit'))) with check ((select public.core_can('smart_plans:edit')));
create policy sp_d on public.sp_records for delete to authenticated using ((select public.core_can('smart_plans:edit')));
grant select on public.sp_records to anon;
grant select, insert, update, delete on public.sp_records to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.sp_records;
exception when duplicate_object then null; end $$;

-- مخزن صور شواهد التنفيذ (عام للعرض كما في الموقع العام؛ الرفع والحذف بالصلاحية)
insert into storage.buckets (id, name, public, file_size_limit)
values ('sp-evidence', 'sp-evidence', true, 15728640)
on conflict (id) do update set public = true, file_size_limit = 15728640;
drop policy if exists sp_evidence_insert on storage.objects;
drop policy if exists sp_evidence_delete on storage.objects;
create policy sp_evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sp-evidence' and (select public.core_can('smart_plans:add')));
create policy sp_evidence_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sp-evidence' and (select public.core_can('smart_plans:edit')));

-- عرض عام بأسماء المنفذين المرتبطين فقط (الاسم والمسمى والصورة المنشورة)؛ يبقى الاسم متزامنًا مع النواة
create or replace view public.sp_executors_public with (security_invoker = false) as
select s.id, s.full_name, coalesce(j.name_ar, s.job_title) as job_title_ar,
       case when s.publish_public then s.public_photo_path end as photo_path
from public.staff_members s
left join public.job_titles j on j.code = s.job_title
where s.is_active and exists (
  select 1 from public.sp_records r
  where jsonb_path_exists(r.data, '$.**.owner_staff_id ? (@ == $id)', jsonb_build_object('id', s.id::text))
     or jsonb_path_exists(r.data, '$.**.executor_staff_id ? (@ == $id)', jsonb_build_object('id', s.id::text)));
grant select on public.sp_executors_public to anon, authenticated;

-- صلاحيات المستخدم الحالي في النظام (للواجهة؛ الفرض الفعلي في RLS والحارس)
create or replace function public.sp_my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'staff_id', public.current_staff_id(),
    'name', (select m.full_name from public.staff_members m where m.user_id = auth.uid()),
    'admin', public.is_core_admin(),
    'view', public.core_can('smart_plans:view'),
    'add', public.core_can('smart_plans:add'),
    'edit', public.core_can('smart_plans:edit'),
    'approve', public.core_can('smart_plans:approve'))
$$;
revoke all on function public.sp_my_access() from public;
grant execute on function public.sp_my_access() to authenticated;

-- تفعيل النظام في سجل أنظمة النواة (تصبح صلاحياته قابلة للمنح من النواة)
update public.systems
   set status = 'connected', description = 'متابعة الخطط والبرامج المدرسية وتوثيق تنفيذها واعتمادها', last_seen_at = now()
 where code = 'smart_plans';
