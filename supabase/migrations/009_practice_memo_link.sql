-- Link club_memos to practice_sessions
alter table public.club_memos
  add column practice_session_id uuid references public.practice_sessions(id) on delete set null;

create index club_memos_practice_session_id_idx on public.club_memos(practice_session_id);
