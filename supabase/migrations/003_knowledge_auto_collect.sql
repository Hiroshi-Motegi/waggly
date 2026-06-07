-- Add status column to knowledge_base
alter table public.knowledge_base
  add column status text not null default 'active'
  check (status in ('draft', 'active', 'inactive', 'rejected'));

-- Migrate is_active data
update public.knowledge_base set status = 'inactive' where is_active = false;

-- Add auto-collection columns
alter table public.knowledge_base
  add column analysis_summary text,
  add column search_sources text[],
  add column generated_at timestamptz;

-- Drop is_active
alter table public.knowledge_base drop column is_active;

-- Update RLS policies (drop old, create new)
drop policy if exists "Authenticated users can read knowledge" on public.knowledge_base;
create policy "Authenticated users can read knowledge" on public.knowledge_base
  for select using (auth.role() = 'authenticated');

-- Auto-run logs table
create table public.knowledge_auto_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  total_sessions integer not null default 0,
  total_plans integer not null default 0,
  summary text not null,
  topics_generated integer not null default 0,
  status text not null check (status in ('success', 'no_data', 'error')),
  error_message text
);

alter table public.knowledge_auto_runs enable row level security;
create policy "Authenticated users can read runs" on public.knowledge_auto_runs
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert runs" on public.knowledge_auto_runs
  for insert with check (auth.role() = 'authenticated');
