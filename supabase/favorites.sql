-- Run this once in Supabase -> SQL Editor to enable Saved jobs (favourites)

-- ============================================================================
-- SAVED JOBS (favourites): a worker taps the heart on a job to save it
-- ============================================================================
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create index if not exists favorites_user_idx on public.favorites(user_id, created_at desc);
alter table public.favorites enable row level security;
drop policy if exists "favorites: read own" on public.favorites;
drop policy if exists "favorites: insert own" on public.favorites;
drop policy if exists "favorites: delete own" on public.favorites;
create policy "favorites: read own" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites: insert own" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites: delete own" on public.favorites for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.favorites to authenticated;

notify pgrst, 'reload schema';
