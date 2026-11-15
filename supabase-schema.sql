-- Run this entire script in Supabase Dashboard > SQL Editor.
-- The admin email is the only account allowed to publish/delete wallpapers.
-- Public users can read wallpaper records and images, and can manage only their own favourites.

create table if not exists public.wallpapers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null default '',
  image_url text not null,
  storage_path text not null,
  downloads bigint not null default 0 check (downloads >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  wallpaper_id uuid not null references public.wallpapers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, wallpaper_id)
);

alter table public.wallpapers enable row level security;
alter table public.favourites enable row level security;

drop policy if exists "Wallpapers are publicly readable" on public.wallpapers;
create policy "Wallpapers are publicly readable"
on public.wallpapers for select using (true);

drop policy if exists "Only site admin can publish wallpapers" on public.wallpapers;
create policy "Only site admin can publish wallpapers"
on public.wallpapers for insert to authenticated
with check ((auth.jwt() ->> 'email') = 'amangamer8529@gmail.com');

drop policy if exists "Only site admin can delete wallpapers" on public.wallpapers;
create policy "Only site admin can delete wallpapers"
on public.wallpapers for delete to authenticated
using ((auth.jwt() ->> 'email') = 'amangamer8529@gmail.com');

drop policy if exists "Only site admin can edit wallpapers" on public.wallpapers;
create policy "Only site admin can edit wallpapers"
on public.wallpapers for update to authenticated
using ((auth.jwt() ->> 'email') = 'amangamer8529@gmail.com')
with check ((auth.jwt() ->> 'email') = 'amangamer8529@gmail.com');

drop policy if exists "Users can view their own favourites" on public.favourites;
create policy "Users can view their own favourites"
on public.favourites for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can add their own favourites" on public.favourites;
create policy "Users can add their own favourites"
on public.favourites for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own favourites" on public.favourites;
create policy "Users can remove their own favourites"
on public.favourites for delete to authenticated
using (auth.uid() = user_id);

-- Safe public RPC for download counts: clients cannot directly edit wallpaper rows.
create or replace function public.increment_wallpaper_downloads(p_wallpaper_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.wallpapers
  set downloads = downloads + 1
  where id = p_wallpaper_id;
$$;

revoke all on function public.increment_wallpaper_downloads(uuid) from public;
grant execute on function public.increment_wallpaper_downloads(uuid) to anon, authenticated;

-- Create a public image bucket, with a 20 MB file cap and image MIME allowlist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wallpapers', 'wallpapers', true, 20971520, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true, file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Anyone can view wallpaper files" on storage.objects;
create policy "Anyone can view wallpaper files"
on storage.objects for select
using (bucket_id = 'wallpapers');

drop policy if exists "Only site admin can upload wallpaper files" on storage.objects;
create policy "Only site admin can upload wallpaper files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'wallpapers'
  and (auth.jwt() ->> 'email') = 'amangamer8529@gmail.com'
);

drop policy if exists "Only site admin can update wallpaper files" on storage.objects;
create policy "Only site admin can update wallpaper files"
on storage.objects for update to authenticated
using (
  bucket_id = 'wallpapers'
  and (auth.jwt() ->> 'email') = 'amangamer8529@gmail.com'
)
with check (
  bucket_id = 'wallpapers'
  and (auth.jwt() ->> 'email') = 'amangamer8529@gmail.com'
);

drop policy if exists "Only site admin can delete wallpaper files" on storage.objects;
create policy "Only site admin can delete wallpaper files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wallpapers'
  and (auth.jwt() ->> 'email') = 'amangamer8529@gmail.com'
);
