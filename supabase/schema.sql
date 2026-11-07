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
  business_name text,
  business_type text check (business_type in ('individual','small_business','company')),
  availability text check (availability in ('full_time','part_time','weekends','anytime')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists years_experience int not null default 0;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists business_type text check (business_type in ('individual','small_business','company'));
alter table public.profiles add column if not exists availability text check (availability in ('full_time','part_time','weekends','anytime'));
alter table public.profiles add column if not exists verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected'));
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
  end_time time,
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
alter table public.jobs add column if not exists end_time time;
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

-- the end time must be after the start time
do $$ begin
  alter table public.jobs add constraint jobs_time_order check (end_time is null or job_time is null or end_time > job_time);
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

-- Time-slot booking: a worker accepted for a job cannot take another job that overlaps in time.
-- Returns the title of the conflicting job, or null. (Jobs without a date + start time are never in conflict.
-- A job without an end time is treated as lasting one hour.)
create or replace function public.worker_booking_conflict(p_worker uuid, p_job uuid) returns text
language sql stable security definer set search_path = public as $$
  select o.title
    from public.jobs j
    join public.applications a on a.worker_id = p_worker and a.status = 'accepted' and a.job_id <> p_job
    join public.jobs o on o.id = a.job_id
   where j.id = p_job
     and j.job_date is not null and j.job_time is not null
     and o.job_date is not null and o.job_time is not null
     and tsrange(j.job_date + j.job_time,
                 (j.job_date + j.job_time) + coalesce(j.end_time - j.job_time, interval '1 hour'), '[)')
      && tsrange(o.job_date + o.job_time,
                 (o.job_date + o.job_time) + coalesce(o.end_time - o.job_time, interval '1 hour'), '[)')
   limit 1
$$;
-- internal only (used by the triggers below): other people's bookings stay private
revoke execute on function public.worker_booking_conflict(uuid, uuid) from public, anon, authenticated;

-- For the app: "am I already booked at the time of this job?" (always about the logged-in user)
create or replace function public.my_booking_conflict(p_job uuid) returns text
language sql stable security definer set search_path = public as $$
  select public.worker_booking_conflict(auth.uid(), p_job)
$$;
grant execute on function public.my_booking_conflict(uuid) to authenticated;

-- A worker cannot apply for a job that overlaps a job they are already booked for
create or replace function public.guard_application_apply() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  c := public.worker_booking_conflict(new.worker_id, new.job_id);
  if c is not null then
    raise exception 'You are already booked for "%" at this time', c;
  end if;
  return new;
end $$;
drop trigger if exists trg_application_apply_guard on public.applications;
create trigger trg_application_apply_guard before insert on public.applications
  for each row execute function public.guard_application_apply();

-- Block accepting more workers than the job needs, or a worker who is already booked at that time
create or replace function public.guard_application_accept() returns trigger
language plpgsql security definer set search_path = public as $$
declare j record; c text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    c := public.worker_booking_conflict(new.worker_id, new.job_id);
    if c is not null then
      raise exception 'This worker is already booked for "%" at that time', c;
    end if;
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

-- ============================================================================
-- VERIFIED ACCOUNTS + PROFILE COMPLETION
-- Public info lives in `profiles` (anyone logged in can read it, including the verified badge).
-- Private info (email, NIC, photos of the NIC, address ...) lives in `profile_private` and can only be
-- read by its owner and by you (admin, via the SQL editor / service role). It is never shown to other users.
-- ============================================================================
create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  nic_number text check (nic_number is null or nic_number ~* '^([0-9]{9}[vx]|[0-9]{12})$'),
  date_of_birth date check (date_of_birth is null or date_of_birth <= (current_date - interval '18 years')),
  gender text check (gender in ('male','female')),
  address text,
  emergency_name text,
  emergency_phone text,
  nic_front_path text,
  nic_back_path text,
  selfie_path text,
  submitted_at timestamptz,
  review_note text,
  updated_at timestamptz not null default now()
);
-- one NIC can only belong to one account
create unique index if not exists profile_private_nic_key on public.profile_private (upper(nic_number)) where nic_number is not null;

drop trigger if exists trg_private_updated_at on public.profile_private;
create trigger trg_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

alter table public.profile_private enable row level security;
drop policy if exists "private: read own" on public.profile_private;
drop policy if exists "private: insert own" on public.profile_private;
drop policy if exists "private: update own" on public.profile_private;
create policy "private: read own" on public.profile_private for select to authenticated using (user_id = auth.uid());
create policy "private: insert own" on public.profile_private for insert to authenticated with check (user_id = auth.uid());
create policy "private: update own" on public.profile_private for update to authenticated using (user_id = auth.uid());

-- Users can never set their own verification status / review note: only these columns are writable.
revoke insert, update on public.profiles from authenticated;
grant insert (id, role, full_name) on public.profiles to authenticated;
grant update (id, role, full_name, location, bio, skills, years_experience, avatar_url, business_name, business_type, availability)
  on public.profiles to authenticated;
revoke insert, update on public.profile_private from authenticated;
grant insert (user_id, email, nic_number, date_of_birth, gender, address, emergency_name, emergency_phone,
              nic_front_path, nic_back_path, selfie_path) on public.profile_private to authenticated;
grant update (user_id, email, nic_number, date_of_birth, gender, address, emergency_name, emergency_phone,
              nic_front_path, nic_back_path, selfie_path) on public.profile_private to authenticated;

-- If someone changes their NIC / photos after being verified (or while under review), they must be reviewed again
create or replace function public.on_private_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.nic_number is distinct from old.nic_number
     or new.nic_front_path is distinct from old.nic_front_path
     or new.nic_back_path is distinct from old.nic_back_path
     or new.selfie_path is distinct from old.selfie_path then
    update public.profiles set verification_status = 'unverified'
     where id = new.user_id and verification_status in ('pending','verified');
  end if;
  return new;
end $$;
drop trigger if exists trg_private_changed on public.profile_private;
create trigger trg_private_changed after update on public.profile_private
  for each row execute function public.on_private_changed();

-- When you verify / reject an account, tell the user
create or replace function public.on_verification_decided() returns trigger
language plpgsql security definer set search_path = public as $$
declare note text;
begin
  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'verified' then
      insert into public.notifications(user_id, type, title, body)
      values (new.id, 'info', 'You are verified ✓', 'Your account is verified. A verified badge now shows on your profile.');
    elsif new.verification_status = 'rejected' then
      select review_note into note from public.profile_private where user_id = new.id;
      insert into public.notifications(user_id, type, title, body)
      values (new.id, 'info', 'Verification declined',
              coalesce('Reason: ' || note, 'Please check your details and photos, then submit again.'));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_verification_decided on public.profiles;
create trigger trg_verification_decided after update of verification_status on public.profiles
  for each row execute function public.on_verification_decided();

-- Profile completion (%) + checklist for the logged-in user. Worker and employer have different checklists.
-- Weights add up to 100 for each role.
create or replace function public.my_profile_progress() returns json
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles; v public.profile_private; result json;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then return null; end if;
  select * into v from public.profile_private where user_id = auth.uid();

  with t(ord, key, label, weight, who, done) as (
    values
      (1,  'photo',         'Add a profile photo',                10, 'both',     p.avatar_url is not null),
      (2,  'location',      'Add your location',                  10, 'both',     coalesce(p.location, '') <> ''),
      (3,  'skills',        'Choose your skills',                 15, 'worker',   coalesce(array_length(p.skills, 1), 0) > 0),
      (4,  'bio',           'Write a short bio',                  10, 'worker',   coalesce(p.bio, '') <> ''),
      (5,  'availability',  'Set your availability',               5, 'worker',   p.availability is not null),
      (6,  'business_name', 'Add your business / employer name',  15, 'employer', coalesce(p.business_name, '') <> ''),
      (7,  'business_type', 'Choose your business type',           5, 'employer', p.business_type is not null),
      (8,  'about',         'Describe your business',             10, 'employer', coalesce(p.bio, '') <> ''),
      (9,  'email',         'Add your email address',             10, 'both',     v.email is not null),
      (10, 'nic',           'Add your NIC number',                10, 'both',     v.nic_number is not null),
      (11, 'emergency',     'Add an emergency contact',           10, 'worker',   v.emergency_name is not null and v.emergency_phone is not null),
      (12, 'address',       'Add your full address',              10, 'employer', v.address is not null),
      (13, 'docs',          'Upload NIC photos and a selfie',     20, 'both',     v.nic_front_path is not null and v.nic_back_path is not null and v.selfie_path is not null)
  ), f as (
    select * from t where who = 'both' or who = p.role
  )
  select json_build_object(
           'percent',     coalesce(sum(weight) filter (where done), 0),
           'status',      p.verification_status,
           'role',        p.role,
           'review_note', v.review_note,
           'items',       json_agg(json_build_object('key', key, 'label', label, 'weight', weight, 'done', done) order by ord)
         )
    into result
    from f;
  return result;
end $$;
grant execute on function public.my_profile_progress() to authenticated;

-- Send the account for review (needs email, NIC number, both NIC photos and a selfie)
create or replace function public.submit_verification() returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles; v public.profile_private;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  select * into v from public.profile_private where user_id = auth.uid();
  if p.verification_status = 'verified' then raise exception 'Your account is already verified'; end if;
  if p.verification_status = 'pending' then raise exception 'Your account is already under review'; end if;
  if v.email is null or v.nic_number is null or v.nic_front_path is null or v.nic_back_path is null or v.selfie_path is null then
    raise exception 'Please add your email, NIC number, NIC photos and a selfie first';
  end if;
  update public.profile_private set submitted_at = now(), review_note = null where user_id = auth.uid();
  update public.profiles set verification_status = 'pending' where id = auth.uid();
end $$;
grant execute on function public.submit_verification() to authenticated;

-- Your review queue (admin only: run `select * from admin_verification_queue;` in the SQL editor)
--   approve:  update public.profiles set verification_status = 'verified' where id = '<user id>';
--   reject:   update public.profile_private set review_note = 'NIC photo is blurry' where user_id = '<user id>';
--             update public.profiles set verification_status = 'rejected' where id = '<user id>';
create or replace view public.admin_verification_queue with (security_invoker = true) as
  select p.id, p.full_name, p.role, p.verification_status,
         v.email, v.nic_number, v.date_of_birth, v.gender, v.address,
         v.emergency_name, v.emergency_phone,
         v.nic_front_path, v.nic_back_path, v.selfie_path, v.submitted_at
    from public.profiles p
    join public.profile_private v on v.user_id = p.id
   where p.verification_status = 'pending'
   order by v.submitted_at;
revoke all on public.admin_verification_queue from anon, authenticated;

-- ============================================================================
-- PUSH NOTIFICATIONS (Expo Push Service)
-- The app saves each phone's Expo push token. Database triggers then call the Expo push API (through pg_net)
-- whenever a notification row is created or a chat message is sent. No server code to deploy.
-- ============================================================================
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net could not be enabled here. In Supabase: Database > Extensions > enable pg_net, then run this file again.';
end $$;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
-- No policies on purpose: the app can only use the two functions below, never read the table directly.
alter table public.push_tokens enable row level security;

-- Save this phone's token for the logged-in user (a phone that switches accounts moves to the new user)
create or replace function public.register_push_token(p_token text, p_platform text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  insert into public.push_tokens(user_id, token, platform, updated_at)
  values (auth.uid(), p_token, p_platform, now())
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end $$;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Forget this phone (called on log out)
create or replace function public.remove_push_token(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
end $$;
grant execute on function public.remove_push_token(text) to authenticated;

-- Send a push to every phone of one user. Internal only: users must never be able to call this themselves.
create or replace function public.send_push(p_user uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare msgs jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'to', token, 'title', p_title, 'body', p_body, 'data', p_data,
           'sound', 'default', 'priority', 'high', 'channelId', 'default')), '[]'::jsonb)
    into msgs
    from public.push_tokens where user_id = p_user;
  if jsonb_array_length(msgs) = 0 then return; end if;
  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := msgs,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
  );
exception when others then
  -- a failed push must never block the real action (applying, messaging ...)
  raise warning 'send_push failed: %', sqlerrm;
end $$;
revoke execute on function public.send_push(uuid, text, text, jsonb) from public, anon, authenticated;

-- every row in `notifications` (new applicant, accepted, declined, verified ...) also becomes a push
create or replace function public.on_notification_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.send_push(new.user_id, new.title, new.body, jsonb_build_object('type', new.type));
  return new;
end $$;
drop trigger if exists trg_notification_push on public.notifications;
create trigger trg_notification_push after insert on public.notifications
  for each row execute function public.on_notification_push();

-- a new chat message is pushed to the other person in the conversation
create or replace function public.on_message_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; sender text; recipient uuid;
begin
  select employer_id, worker_id into c from public.conversations where id = new.conversation_id;
  recipient := case when new.sender_id = c.employer_id then c.worker_id else c.employer_id end;
  select coalesce(business_name, full_name, 'New message') into sender from public.profiles where id = new.sender_id;
  perform public.send_push(recipient, sender, left(new.body, 120),
                           jsonb_build_object('type', 'message', 'conversationId', new.conversation_id));
  return new;
end $$;
drop trigger if exists trg_message_push on public.messages;
create trigger trg_message_push after insert on public.messages
  for each row execute function public.on_message_push();

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
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ---------- STORAGE (photos) ------------------------------------------------
insert into storage.buckets (id, name, public) values ('job-images', 'job-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('verification-docs', 'verification-docs', false)
  on conflict (id) do nothing;

drop policy if exists "job-images: public read" on storage.objects;
drop policy if exists "job-images: upload to own folder" on storage.objects;
drop policy if exists "job-images: delete own" on storage.objects;
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: upload to own folder" on storage.objects;
drop policy if exists "avatars: delete own" on storage.objects;
drop policy if exists "verification-docs: read own" on storage.objects;
drop policy if exists "verification-docs: upload own" on storage.objects;
drop policy if exists "verification-docs: update own" on storage.objects;
drop policy if exists "verification-docs: delete own" on storage.objects;

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

-- NIC photos and selfies: private bucket, each user can only see / upload files in their own folder
create policy "verification-docs: read own" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification-docs: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification-docs: update own" on storage.objects for update to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification-docs: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- refresh the API schema cache so new columns/tables are visible immediately
notify pgrst, 'reload schema';
