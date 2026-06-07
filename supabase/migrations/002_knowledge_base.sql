-- Knowledge base for AI teaching data
create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  tags text[] default null,
  source text default null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.knowledge_base enable row level security;

-- Authenticated users can read/write (admin-only page, not linked from app)
create policy "Authenticated users can read knowledge" on public.knowledge_base
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert knowledge" on public.knowledge_base
  for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update knowledge" on public.knowledge_base
  for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete knowledge" on public.knowledge_base
  for delete using (auth.role() = 'authenticated');

create index knowledge_base_category_idx on public.knowledge_base(category);
