-- Accessory images (multiple images per accessory, like club_images)
create table public.accessory_images (
  id uuid primary key default gen_random_uuid(),
  accessory_id uuid not null references public.accessories(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.accessory_images enable row level security;
create policy "Users can CRUD own accessory images" on public.accessory_images for all
  using (exists (select 1 from public.accessories where accessories.id = accessory_images.accessory_id and accessories.user_id = auth.uid()));
create index accessory_images_accessory_id_idx on public.accessory_images(accessory_id);

-- Migrate existing image_url data to accessory_images
insert into public.accessory_images (accessory_id, image_url, is_primary)
select id, image_url, true
from public.accessories
where image_url is not null;
