-- Run this in the Supabase SQL Editor

create type item_type as enum ('film', 'book', 'show');

create table items (
  id         uuid primary key default gen_random_uuid(),
  type       item_type not null,
  title      text not null,
  cover_url  text,
  source_url text,
  added_at   timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table users (
  telegram_id bigint primary key,
  username    text,
  is_admin    boolean not null default false
);

-- Public read access for the PWA (using anon key)
alter table items enable row level security;

create policy "Public read" on items
  for select using (true);

create policy "Service role insert/update" on items
  for all using (auth.role() = 'service_role');

-- Storage bucket is created via the Supabase dashboard (see SETUP.md)
