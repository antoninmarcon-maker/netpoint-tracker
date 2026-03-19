-- Enable PostGIS for geospatial data
create extension if not exists postgis schema extensions;

-- Spots Table
create table if not exists public.spots (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    location geography(point) not null,
    type text check (type in ('indoor', 'outdoor_hard', 'outdoor_grass', 'beach')),
    availability_period text,
    status text default 'waiting_for_validation' check (status in ('waiting_for_validation', 'validated', 'rejected')),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default now() not null
);

-- Spot Photos Table
create table if not exists public.spot_photos (
    id uuid default gen_random_uuid() primary key,
    spot_id uuid references public.spots(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    photo_url text not null,
    created_at timestamp with time zone default now() not null
);

-- Spot Comments Table
create table if not exists public.spot_comments (
    id uuid default gen_random_uuid() primary key,
    spot_id uuid references public.spots(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    content text not null,
    created_at timestamp with time zone default now() not null
);

-- Setup RLS
alter table public.spots enable row level security;
alter table public.spot_photos enable row level security;
alter table public.spot_comments enable row level security;

-- Policies for Spots
create policy "Spots are viewable by everyone." on public.spots
  for select using (true);

create policy "Authenticated users can create spots." on public.spots
  for insert to authenticated with check (true);

create policy "Users can update their own spots." on public.spots
  for update to authenticated using (auth.uid() = user_id);

-- Policies for Photos
create policy "Spot photos are viewable by everyone." on public.spot_photos
  for select using (true);

create policy "Authenticated users can upload spot photos." on public.spot_photos
  for insert to authenticated with check (true);

create policy "Users can delete their own spot photos." on public.spot_photos
  for delete to authenticated using (auth.uid() = user_id);

-- Policies for Comments
create policy "Spot comments are viewable by everyone." on public.spot_comments
  for select using (true);

create policy "Authenticated users can create spot comments." on public.spot_comments
  for insert to authenticated with check (true);

create policy "Users can delete their own spot comments." on public.spot_comments
  for delete to authenticated using (auth.uid() = user_id);

-- Storage bucket for spot photos
insert into storage.buckets (id, name, public) 
values ('spot-photos', 'spot-photos', true) 
on conflict (id) do nothing;

create policy "Spot photos are publicly accessible."
on storage.objects for select
using ( bucket_id = 'spot-photos' );

create policy "Authenticated users can upload photos."
on storage.objects for insert
to authenticated
with check ( bucket_id = 'spot-photos' );

create policy "Users can delete their own uploaded photos."
on storage.objects for delete
to authenticated
using ( auth.uid() = owner and bucket_id = 'spot-photos' );

-- View spots_with_coords is created by later migrations using lat/lng columns directly
