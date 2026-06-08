-- Add release_year and memo to clubs table
alter table public.clubs add column if not exists release_year integer;
alter table public.clubs add column if not exists memo text;

-- Club memos (distance/memo log)
create table if not exists public.club_memos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  distance integer,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.club_memos enable row level security;
create policy "Users can CRUD own club memos" on public.club_memos for all
  using (exists (select 1 from public.clubs where clubs.id = club_memos.club_id and clubs.user_id = auth.uid()));
create index if not exists club_memos_club_id_idx on public.club_memos(club_id);
