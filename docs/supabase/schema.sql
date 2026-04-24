-- Social Vibe — canonical Supabase schema
-- Run once in Supabase -> SQL Editor. Safe to re-run (idempotent).
-- Creator admin is pinned to the email below.

do $$
begin
  perform set_config(
    'app.creator_email',
    'heartreisure@gmail.com',
    false
  );
end $$;

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  handle text not null default '',
  bio_short text not null default '',
  role_label text not null default 'member',
  age smallint,
  is_creator boolean not null default false,
  is_admin boolean not null default false,
  admin_approved_at timestamptz,
  admin_approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_profiles_handle_unique
  on public.user_profiles (lower(handle))
  where length(handle) > 0;

alter table public.user_profiles enable row level security;

create or replace function public.user_profiles_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_touch on public.user_profiles;
create trigger trg_user_profiles_touch
  before update on public.user_profiles
  for each row execute function public.user_profiles_touch();

-- ---------------------------------------------------------------------------
-- Creator bootstrap — auto mark heartreisure@gmail.com as creator + admin
-- ---------------------------------------------------------------------------
create or replace function public.user_profiles_apply_creator()
returns trigger
language plpgsql
security definer
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = new.id;
  if v_email is not null and lower(v_email) = lower(current_setting('app.creator_email', true)) then
    new.is_creator := true;
    new.is_admin := true;
    if new.role_label is null or length(new.role_label) = 0 or new.role_label = 'member' then
      new.role_label := 'admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_creator on public.user_profiles;
create trigger trg_user_profiles_creator
  before insert or update on public.user_profiles
  for each row execute function public.user_profiles_apply_creator();

-- ---------------------------------------------------------------------------
-- Create profile row automatically when a user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (
    id, display_name, handle, bio_short, role_label
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'preferred_username', ''),
    coalesce(new.raw_user_meta_data->>'bio_short', ''),
    coalesce(new.raw_user_meta_data->>'role_label', 'member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- admin_requests — users ask to become admin; only creator can approve
-- ---------------------------------------------------------------------------
create table if not exists public.admin_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists admin_requests_one_pending_per_user
  on public.admin_requests (user_id) where status = 'pending';

alter table public.admin_requests enable row level security;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  moderation_status text not null default 'active'
    check (moderation_status in ('active', 'flagged', 'hidden')),
  flagged_reason text default '',
  moderated_by uuid,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id);

alter table public.posts enable row level security;

-- ---------------------------------------------------------------------------
-- post_reports
-- ---------------------------------------------------------------------------
create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null default '',
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists post_reports_unique_reporter
  on public.post_reports (post_id, reporter_id);

alter table public.post_reports enable row level security;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select up.is_admin or up.is_creator from public.user_profiles up where up.id = uid),
    false
  );
$$;

create or replace function public.is_creator(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select up.is_creator from public.user_profiles up where up.id = uid),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Policies — user_profiles
-- ---------------------------------------------------------------------------
drop policy if exists user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles
  for select using (true);

drop policy if exists user_profiles_insert_self on public.user_profiles;
create policy user_profiles_insert_self on public.user_profiles
  for insert with check (id = auth.uid());

drop policy if exists user_profiles_update_self on public.user_profiles;
create policy user_profiles_update_self on public.user_profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and (select up.is_admin from public.user_profiles up where up.id = auth.uid()) is not distinct from is_admin
    and (select up.is_creator from public.user_profiles up where up.id = auth.uid()) is not distinct from is_creator
  );

drop policy if exists user_profiles_update_admin on public.user_profiles;
create policy user_profiles_update_admin on public.user_profiles
  for update using (public.is_admin(auth.uid()));

drop policy if exists user_profiles_delete_creator on public.user_profiles;
create policy user_profiles_delete_creator on public.user_profiles
  for delete using (public.is_creator(auth.uid()));

-- ---------------------------------------------------------------------------
-- Policies — admin_requests
-- ---------------------------------------------------------------------------
drop policy if exists admin_requests_select on public.admin_requests;
create policy admin_requests_select on public.admin_requests
  for select using (
    user_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists admin_requests_insert_self on public.admin_requests;
create policy admin_requests_insert_self on public.admin_requests
  for insert with check (user_id = auth.uid());

drop policy if exists admin_requests_update_creator on public.admin_requests;
create policy admin_requests_update_creator on public.admin_requests
  for update using (public.is_creator(auth.uid()))
  with check (public.is_creator(auth.uid()));

drop policy if exists admin_requests_delete_creator on public.admin_requests;
create policy admin_requests_delete_creator on public.admin_requests
  for delete using (public.is_creator(auth.uid()));

-- ---------------------------------------------------------------------------
-- Policies — posts
-- ---------------------------------------------------------------------------
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select using (
    moderation_status <> 'hidden' or public.is_admin(auth.uid())
  );

drop policy if exists posts_insert_self on public.posts;
create policy posts_insert_self on public.posts
  for insert with check (user_id = auth.uid());

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists posts_update_admin on public.posts;
create policy posts_update_admin on public.posts
  for update using (public.is_admin(auth.uid()));

drop policy if exists posts_delete_admin on public.posts;
create policy posts_delete_admin on public.posts
  for delete using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Policies — post_reports
-- ---------------------------------------------------------------------------
drop policy if exists post_reports_select on public.post_reports;
create policy post_reports_select on public.post_reports
  for select using (
    reporter_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists post_reports_insert_self on public.post_reports;
create policy post_reports_insert_self on public.post_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists post_reports_update_admin on public.post_reports;
create policy post_reports_update_admin on public.post_reports
  for update using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Promote existing creator account if it already exists
-- ---------------------------------------------------------------------------
update public.user_profiles up
  set is_creator = true,
      is_admin = true,
      role_label = case when role_label in ('member','') then 'admin' else role_label end
  from auth.users u
  where up.id = u.id and lower(u.email) = lower(current_setting('app.creator_email', true));
