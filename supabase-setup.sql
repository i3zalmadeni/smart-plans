-- الخطط الذكية — إعداد قاعدة البيانات في Supabase
-- الصق هذا الملف كاملًا في: Supabase ← SQL Editor ← New query ← Run
-- الاستعراض للجميع، والإضافة والحذف لمن سجّل الدخول فقط.

-- 1) جدول السجلات (التنفيذات والبرامج غير المخططة)
create table if not exists public.records (
  id         uuid primary key default gen_random_uuid(),
  col        text not null check (col in ('executions', 'unplanned')),
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists records_col_idx on public.records (col, created_at);

alter table public.records enable row level security;

drop policy if exists "public read"   on public.records;
drop policy if exists "editor insert" on public.records;
drop policy if exists "editor update" on public.records;
drop policy if exists "editor delete" on public.records;

create policy "public read"   on public.records for select to anon, authenticated using (true);
create policy "editor insert" on public.records for insert to authenticated with check (true);
create policy "editor update" on public.records for update to authenticated using (true) with check (true);
create policy "editor delete" on public.records for delete to authenticated using (true);

-- تحديث فوري لدى كل الزوار عند الإضافة أو الحذف
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;

-- 2) مخزن صور الشواهد (عام للعرض، والرفع والحذف للمحررين)
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "evidence editor upload" on storage.objects;
drop policy if exists "evidence editor delete" on storage.objects;

create policy "evidence editor upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'evidence');
create policy "evidence editor delete" on storage.objects
  for delete to authenticated using (bucket_id = 'evidence');
