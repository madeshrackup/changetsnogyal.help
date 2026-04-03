-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Then: Database → Replication → ensure `love_notes_for_chan` is enabled for Realtime,
--   or run the ALTER PUBLICATION line below.

create table if not exists public.love_notes_for_chan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message_text text not null,
  from_name text
);

alter table public.love_notes_for_chan enable row level security;

-- Public read + insert for the anon key (tune if you add auth later)
create policy "Anyone can read love notes"
  on public.love_notes_for_chan
  for select
  using (true);

create policy "Anyone can post a love note"
  on public.love_notes_for_chan
  for insert
  with check (true);

-- Required for Realtime: add table to the supabase_realtime publication
alter publication supabase_realtime add table public.love_notes_for_chan;
