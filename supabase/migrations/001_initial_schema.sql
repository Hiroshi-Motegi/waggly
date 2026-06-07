-- Users profile table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  line_user_id text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Clubs
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in ('driver', 'fairway_wood', 'utility', 'iron', 'wedge', 'putter')),
  club_number text not null,
  maker text,
  model text,
  shaft_name text,
  shaft_flex text,
  loft numeric,
  lie numeric,
  length numeric,
  distance integer,
  purchase_date date,
  purchase_shop text,
  purchase_price integer,
  status text not null default 'active' check (status in ('active', 'stored', 'sold')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;
create policy "Users can CRUD own clubs" on public.clubs for all using (auth.uid() = user_id);
create index clubs_user_id_idx on public.clubs(user_id);

-- Club images
create table public.club_images (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.club_images enable row level security;
create policy "Users can CRUD own club images" on public.club_images for all
  using (exists (select 1 from public.clubs where clubs.id = club_images.club_id and clubs.user_id = auth.uid()));
create index club_images_club_id_idx on public.club_images(club_id);

-- Maintenances
create table public.maintenances (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  type text not null check (type in ('grip_change', 'reshaft', 'loft_adjust', 'other')),
  description text,
  shop text,
  cost integer,
  done_at date not null,
  created_at timestamptz not null default now()
);

alter table public.maintenances enable row level security;
create policy "Users can CRUD own maintenances" on public.maintenances for all
  using (exists (select 1 from public.clubs where clubs.id = maintenances.club_id and clubs.user_id = auth.uid()));
create index maintenances_club_id_idx on public.maintenances(club_id);

-- Practice sessions
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  practiced_at date not null default current_date,
  location text,
  total_balls integer,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.practice_sessions enable row level security;
create policy "Users can CRUD own practice sessions" on public.practice_sessions for all using (auth.uid() = user_id);
create index practice_sessions_user_id_idx on public.practice_sessions(user_id);

-- Practice clubs (per-club ball count)
create table public.practice_clubs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  balls integer not null default 0
);

alter table public.practice_clubs enable row level security;
create policy "Users can CRUD own practice clubs" on public.practice_clubs for all
  using (exists (select 1 from public.practice_sessions where practice_sessions.id = practice_clubs.session_id and practice_sessions.user_id = auth.uid()));
create index practice_clubs_session_id_idx on public.practice_clubs(session_id);

-- Practice plans (AI-generated)
create table public.practice_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  summary text not null,
  source text not null check (source in ('auto', 'chat')),
  status text not null default 'new' check (status in ('new', 'done', 'skipped')),
  created_at timestamptz not null default now()
);

alter table public.practice_plans enable row level security;
create policy "Users can CRUD own practice plans" on public.practice_plans for all using (auth.uid() = user_id);
create index practice_plans_user_id_idx on public.practice_plans(user_id);

-- Practice plan items
create table public.practice_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.practice_plans(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  balls integer not null,
  focus text not null,
  sort_order integer not null default 0
);

alter table public.practice_plan_items enable row level security;
create policy "Users can CRUD own plan items" on public.practice_plan_items for all
  using (exists (select 1 from public.practice_plans where practice_plans.id = practice_plan_items.plan_id and practice_plans.user_id = auth.uid()));
create index practice_plan_items_plan_id_idx on public.practice_plan_items(plan_id);

-- AI chat history
create table public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid not null default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_chats enable row level security;
create policy "Users can CRUD own chats" on public.ai_chats for all using (auth.uid() = user_id);
create index ai_chats_user_id_idx on public.ai_chats(user_id);
create index ai_chats_conversation_id_idx on public.ai_chats(conversation_id);

-- Storage bucket for club images
insert into storage.buckets (id, name, public) values ('club-images', 'club-images', true);
create policy "Users can upload club images" on storage.objects for insert
  with check (bucket_id = 'club-images' and auth.role() = 'authenticated');
create policy "Users can read club images" on storage.objects for select
  using (bucket_id = 'club-images');
create policy "Users can delete own club images" on storage.objects for delete
  using (bucket_id = 'club-images' and auth.uid()::text = (storage.foldername(name))[1]);
