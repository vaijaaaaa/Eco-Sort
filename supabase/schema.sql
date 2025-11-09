-- Supabase schema bootstrap for EcoSort marketplace
-- Run this entire file in Supabase SQL editor or via `supabase db push`

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Utility function to keep `updated_at` in sync --------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  create type public.listing_status as enum ('available', 'pending', 'sold');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.request_status as enum ('pending', 'accepted', 'declined');
exception
  when duplicate_object then null;
end $$;
-- Profiles ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  location text,
  phone text,
  bio text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Listings ----------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  condition text not null,
  description text,
  price numeric(12,2) not null,
  currency text not null default 'USD',
  location text not null,
  status public.listing_status not null default 'available',
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

create index if not exists listings_owner_idx on public.listings(owner_id);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_search_idx on public.listings using gin ((to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(location,''))));

-- Listing images ----------------------------------------------------------
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images(listing_id);

-- Buy requests ------------------------------------------------------------
create table if not exists public.buy_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_buy_requests_updated_at on public.buy_requests;
create trigger set_buy_requests_updated_at
before update on public.buy_requests
for each row
execute function public.set_updated_at();

create index if not exists buy_requests_listing_idx on public.buy_requests(listing_id);
create index if not exists buy_requests_buyer_idx on public.buy_requests(buyer_id);

-- Saved listings ----------------------------------------------------------
create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

create index if not exists saved_listings_user_idx on public.saved_listings(user_id);
create index if not exists saved_listings_listing_idx on public.saved_listings(listing_id);

-- Profile bootstrap trigger (server-side profile creation) ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Row Level Security ------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.buy_requests enable row level security;
alter table public.saved_listings enable row level security;

-- Profiles policies
drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles
for select
using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Listings policies
drop policy if exists listings_read_all on public.listings;
create policy listings_read_all on public.listings
for select
using (true);

drop policy if exists listings_insert_owner on public.listings;
create policy listings_insert_owner on public.listings
for insert
with check (auth.uid() = owner_id);

drop policy if exists listings_update_owner on public.listings;
create policy listings_update_owner on public.listings
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists listings_delete_owner on public.listings;
create policy listings_delete_owner on public.listings
for delete
using (auth.uid() = owner_id);

-- Listing images policies
drop policy if exists listing_images_read_all on public.listing_images;
create policy listing_images_read_all on public.listing_images
for select
using (true);

drop policy if exists listing_images_insert_owner on public.listing_images;
create policy listing_images_insert_owner on public.listing_images
for insert
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists listing_images_modify_owner on public.listing_images;
create policy listing_images_modify_owner on public.listing_images
for update using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists listing_images_delete_owner on public.listing_images;
create policy listing_images_delete_owner on public.listing_images
for delete using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

-- Buy requests policies
drop policy if exists buy_requests_select_participants on public.buy_requests;
create policy buy_requests_select_participants on public.buy_requests
for select using (
  auth.uid() = buyer_id
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists buy_requests_insert_buyer on public.buy_requests;
create policy buy_requests_insert_buyer on public.buy_requests
for insert
with check (auth.uid() = buyer_id);

drop policy if exists buy_requests_update_buyer on public.buy_requests;
create policy buy_requests_update_buyer on public.buy_requests
for update using (auth.uid() = buyer_id)
with check (auth.uid() = buyer_id);

drop policy if exists buy_requests_update_seller on public.buy_requests;
create policy buy_requests_update_seller on public.buy_requests
for update using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists buy_requests_delete_participants on public.buy_requests;
create policy buy_requests_delete_participants on public.buy_requests
for delete using (
  auth.uid() = buyer_id
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

-- Saved listings policies
drop policy if exists saved_listings_select_owner on public.saved_listings;
create policy saved_listings_select_owner on public.saved_listings
for select using (auth.uid() = user_id);

drop policy if exists saved_listings_insert_owner on public.saved_listings;
create policy saved_listings_insert_owner on public.saved_listings
for insert with check (auth.uid() = user_id);

drop policy if exists saved_listings_delete_owner on public.saved_listings;
create policy saved_listings_delete_owner on public.saved_listings
for delete using (auth.uid() = user_id);

-- Grants ------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.listing_images to authenticated;
grant select, insert, update, delete on public.buy_requests to authenticated;
grant select, insert, delete on public.saved_listings to authenticated;

-- The anon role should be able to read listings for marketplace browsing
grant select on public.listings to anon;
grant select on public.listing_images to anon;
``