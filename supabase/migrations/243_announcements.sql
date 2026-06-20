-- Site announcements managed by admin
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  published_at timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anyone can read published announcements
alter table public.announcements enable row level security;

create policy "Anyone can read published announcements"
  on public.announcements for select
  using (is_published = true and published_at <= now());

-- Index for ordering
create index idx_announcements_published_at on public.announcements (published_at desc)
  where is_published = true;
