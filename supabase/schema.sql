-- ============================================================================
-- JobLink LK - full database schema (v2). Safe to run again on top of v1.
-- Supabase Dashboard -> SQL Editor -> New query -> paste all -> Run
-- ============================================================================

-- ---------- TABLES ----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('worker','employer')),
  full_name text,
  location text,
  bio text,
  skills text[] not null default '{}',
  years_experience int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists years_experience int not null default 0;
alter table public.profiles add column if not exists avatar_url text;
-- phone numbers stay private inside auth.users (profiles are readable by other users)
alter table public.profiles drop column if exists phone;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  pay numeric not null check (pay > 0),
  pay_type text not null default 'fixed' check (pay_type in ('fixed','per day','per trip')),
  location text not null,
  job_date date,
  job_time time,
  image_url text,
  urgent boolean not null default false,
  lat double precision,
  lng double precision,
  workers_needed int not null default 1 check (workers_needed between 1 and 100),
  positions_filled int not null default 0,
  status text not null default 'active' check (status in ('active','closed','draft')),
  created_at timestamptz not null default now()
);
alter table public.jobs add column if not exists urgent boolean not null default false;
alter table public.jobs add column if not exists lat double precision;
alter table public.jobs add column if not exists lng double precision;
alter table public.jobs add column if not exists workers_needed int not null default 1 check (workers_needed between 1 and 100);
alter table public.jobs add column if not exists positions_filled int not null default 0;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (employer_id, worker_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('application','accepted','rejected','message','info')),
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- workers_needed can never go below the number of workers already hired
do $$ begin
  alter table public.jobs add constraint jobs_filled_le_needed check (workers_needed >= positions_filled);
exception when duplicate_object then null;
end $$;

-- ---------- INDEXES ---------------------------------------------------------
create index if not exists jobs_employer_idx on public.jobs(employer_id);
create index if not exists jobs_created_idx on public.jobs(created_at desc);
create index if not exists applications_job_idx on public.applications(job_id);
create index if not exists applications_worker_idx on public.applications(worker_id);
create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------- PROFESSIONAL EXTRAS ---------------------------------------------
-- jobs.updated_at, maintained automatically
alter table public.jobs add column if not exists updated_at timestamptz not null default now();
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- fast lookups for the Home feed (active jobs, urgent first, newest first)
create index if not exists jobs_feed_idx on public.jobs(status, urgent, created_at desc);

-- Live numbers for the Home screen cards (computed in the database, not hard-coded in the app)
create or replace function public.job_market_stats() returns json
language sql stable as $$
  select json_build_object(
    'open_jobs',      count(*) filter (where status = 'active'),
    'urgent_jobs',    count(*) filter (where status = 'active' and urgent),
    'avg_pay',        coalesce(round(avg(pay) filter (where status = 'active')), 0),
    'open_positions', coalesce(sum(workers_needed - positions_filled) filter (where status = 'active'), 0)
  ) from public.jobs
$$;
grant execute on function public.job_market_stats() to anon, authenticated;

-- ---------- RATINGS VIEW ----------------------------------------------------
create or replace view public.user_ratings with (security_invoker = true) as
  select reviewee_id as user_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int as review_count
  from public.reviews
  group by reviewee_id;

-- Number of jobs a worker was accepted for (visible to employers reviewing applicants)
create or replace function public.accepted_jobs_count(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.applications where worker_id = p_user and status = 'accepted'
$$;
grant execute on function public.accepted_jobs_count(uuid) to authenticated;

-- Lets a worker keep seeing a job they applied to even after the employer closes it
create or replace function public.i_applied_to(p_job uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where job_id = p_job and worker_id = auth.uid())
$$;
grant execute on function public.i_applied_to(uuid) to authenticated;

-- ---------- TRIGGERS --------------------------------------------------------
-- New application -> notify the employer
create or replace function public.on_application_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare j record; w text;
begin
  select employer_id, title into j from public.jobs where id = new.job_id;
  select coalesce(full_name, 'A worker') into w from public.profiles where id = new.worker_id;
  insert into public.notifications(user_id, type, title, body)
  values (j.employer_id, 'application', 'New applicant', w || ' applied for "' || j.title || '".');
  return new;
end $$;
drop trigger if exists trg_application_created on public.applications;
create trigger trg_application_created after insert on public.applications
  for each row execute function public.on_application_created();

-- Application accepted / rejected -> notify the worker
create or replace function public.on_application_decided() returns trigger
language plpgsql security definer set search_path = public as $$
declare j record; e text;
begin
  if new.status is distinct from old.status and new.status in ('accepted','rejected') then
    select employer_id, title into j from public.jobs where id = new.job_id;
    select coalesce(full_name, 'The employer') into e from public.profiles where id = j.employer_id;
    insert into public.notifications(user_id, type, title, body)
    values (
      new.worker_id,
      new.status,
      case when new.status = 'accepted' then 'Application accepted!' else 'Application declined' end,
      e || case when new.status = 'accepted' then ' accepted' else ' declined' end
        || ' your application for "' || j.title || '".'
    );
  end if;
  return new;
end $$;
drop trigger if exists trg_application_decided on public.applications;
create trigger trg_application_decided after update on public.applications
  for each row execute function public.on_application_decided();

-- Block accepting more workers than the job needs
create or replace function public.guard_application_accept() returns trigger
language plpgsql security definer set search_path = public as $$
declare j record;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select workers_needed, positions_filled into j from public.jobs where id = new.job_id for update;
    if j.positions_filled >= j.workers_needed then
      raise exception 'All positions for this job are already filled';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_application_guard on public.applications;
create trigger trg_application_guard before update on public.applications
  for each row execute function public.guard_application_accept();

-- Keep jobs.positions_filled up to date, and close the job automatically when it is full
create or replace function public.sync_job_positions() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.status is distinct from old.status then
    select count(*) into n from public.applications where job_id = new.job_id and status = 'accepted';
    update public.jobs
       set positions_filled = n,
           status = case when n >= workers_needed and status = 'active' then 'closed' else status end
     where id = new.job_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_application_sync on public.applications;
create trigger trg_application_sync after update on public.applications
  for each row execute function public.sync_job_positions();

-- one-time backfill for jobs that already have accepted applicants
update public.jobs j
   set positions_filled = (select count(*) from public.applications a where a.job_id = j.id and a.status = 'accepted');

-- New message -> keep the conversation preview up to date
create or replace function public.on_message_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = left(new.body, 120), last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists trg_message_created on public.messages;
create trigger trg_message_created after insert on public.messages
  for each row execute function public.on_message_created();

-- ---------- ROW LEVEL SECURITY ---------------------------------------------
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- profiles (public info only; any logged-in user can read)
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: authenticated read" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: authenticated read" on public.profiles for select to authenticated using (true);
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update to authenticated using (auth.uid() = id);

-- jobs
drop policy if exists "jobs: anyone reads active, owner reads all" on public.jobs;
drop policy if exists "jobs: read active or own" on public.jobs;
drop policy if exists "jobs: read active, own, or applied" on public.jobs;
drop policy if exists "jobs: employer inserts own" on public.jobs;
drop policy if exists "jobs: employer updates own" on public.jobs;
drop policy if exists "jobs: employer deletes own" on public.jobs;
create policy "jobs: read active, own, or applied" on public.jobs for select
  using (status = 'active' or employer_id = auth.uid() or public.i_applied_to(id));
create policy "jobs: employer inserts own" on public.jobs for insert to authenticated
  with check (employer_id = auth.uid());
create policy "jobs: employer updates own" on public.jobs for update to authenticated
  using (employer_id = auth.uid());
create policy "jobs: employer deletes own" on public.jobs for delete to authenticated
  using (employer_id = auth.uid());

-- applications
drop policy if exists "applications: worker inserts own" on public.applications;
drop policy if exists "applications: worker applies" on public.applications;
drop policy if exists "applications: worker or job owner reads" on public.applications;
drop policy if exists "applications: employer decides" on public.applications;
create policy "applications: worker applies" on public.applications for insert to authenticated
  with check (
    worker_id = auth.uid()
    and exists (select 1 from public.jobs j
                where j.id = job_id and j.status = 'active' and j.employer_id <> auth.uid())
  );
create policy "applications: worker or job owner reads" on public.applications for select to authenticated
  using (worker_id = auth.uid()
         or exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = auth.uid()));
create policy "applications: employer decides" on public.applications for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = auth.uid()));

-- reviews (only after an accepted application between the two people)
drop policy if exists "reviews: authenticated read" on public.reviews;
drop policy if exists "reviews: insert after accepted job" on public.reviews;
create policy "reviews: authenticated read" on public.reviews for select to authenticated using (true);
create policy "reviews: insert after accepted job" on public.reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.applications a join public.jobs j on j.id = a.job_id
      where a.job_id = reviews.job_id and a.status = 'accepted'
        and ((j.employer_id = reviewer_id and a.worker_id = reviewee_id)
          or (a.worker_id = reviewer_id and j.employer_id = reviewee_id))
    )
  );

-- conversations
drop policy if exists "conversations: members read" on public.conversations;
drop policy if exists "conversations: member creates" on public.conversations;
create policy "conversations: members read" on public.conversations for select to authenticated
  using (auth.uid() in (employer_id, worker_id));
create policy "conversations: member creates" on public.conversations for insert to authenticated
  with check (auth.uid() in (employer_id, worker_id));

-- messages
drop policy if exists "messages: members read" on public.messages;
drop policy if exists "messages: member sends" on public.messages;
drop policy if exists "messages: recipient marks read" on public.messages;
create policy "messages: members read" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and auth.uid() in (c.employer_id, c.worker_id)));
create policy "messages: member sends" on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and auth.uid() in (c.employer_id, c.worker_id)));
create policy "messages: recipient marks read" on public.messages for update to authenticated
  using (sender_id <> auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and auth.uid() in (c.employer_id, c.worker_id)));

-- notifications (users only see / update their own; rows are created by triggers)
drop policy if exists "notifications: read own" on public.notifications;
drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications: update own" on public.notifications for update to authenticated
  using (user_id = auth.uid());

-- ---------- REALTIME (live chat) -------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

-- ---------- STORAGE (photos) ------------------------------------------------
insert into storage.buckets (id, name, public) values ('job-images', 'job-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "job-images: public read" on storage.objects;
drop policy if exists "job-images: upload to own folder" on storage.objects;
drop policy if exists "job-images: delete own" on storage.objects;
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: upload to own folder" on storage.objects;
drop policy if exists "avatars: delete own" on storage.objects;

create policy "job-images: public read" on storage.objects for select
  using (bucket_id = 'job-images');
create policy "job-images: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "job-images: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- refresh the API schema cache so new columns/tables are visible immediately
notify pgrst, 'reload schema';
