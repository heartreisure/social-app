-- Social Vibe: baseline schema for auth + profiles + posts
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  handle text not null unique check (char_length(handle) between 2 and 30),
  bio_short text not null default '' check (char_length(bio_short) <= 180),
  role_label text not null default 'Creator' check (char_length(role_label) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 240),
  created_at timestamptz not null default now(),
  moderation_status text not null default 'active' check (moderation_status in ('active', 'flagged', 'hidden')),
  flagged_reason text not null default '',
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 200),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index if not exists idx_posts_user_created_at
  on public.posts (user_id, created_at desc);

create index if not exists idx_posts_created_at
  on public.posts (created_at desc);
create index if not exists idx_posts_moderation_status
  on public.posts (moderation_status);
create index if not exists idx_post_reports_status
  on public.post_reports (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_reports enable row level security;

drop policy if exists "profiles_select_public" on public.user_profiles;
create policy "profiles_select_public"
on public.user_profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self" on public.user_profiles;
create policy "profiles_insert_self"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.user_profiles;
create policy "profiles_update_self"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated"
on public.posts
for select
to authenticated
using (true);

drop policy if exists "posts_insert_self" on public.posts;
create policy "posts_insert_self"
on public.posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "posts_update_self" on public.posts;
create policy "posts_update_self"
on public.posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "posts_moderate_admin" on public.posts;
create policy "posts_moderate_admin"
on public.posts
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and lower(up.role_label) in ('admin', 'moderator')
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and lower(up.role_label) in ('admin', 'moderator')
  )
);

drop policy if exists "posts_delete_self" on public.posts;
create policy "posts_delete_self"
on public.posts
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reports_insert_self" on public.post_reports;
create policy "reports_insert_self"
on public.post_reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own_or_admin" on public.post_reports;
create policy "reports_select_own_or_admin"
on public.post_reports
for select
to authenticated
using (
  auth.uid() = reporter_id
  or exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and lower(up.role_label) in ('admin', 'moderator')
  )
);

drop policy if exists "reports_update_admin" on public.post_reports;
create policy "reports_update_admin"
on public.post_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and lower(up.role_label) in ('admin', 'moderator')
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and lower(up.role_label) in ('admin', 'moderator')
  )
);
