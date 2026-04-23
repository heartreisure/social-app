# Supabase Setup

Use this once to make account creation + profile data work end-to-end.

## 1) Create project and env

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEMO_USER_ID` (optional fallback)

Restart `npm run dev` after editing env vars.

## 2) Run SQL schema

Open Supabase Dashboard -> SQL Editor and run:

- `supabase/schema.sql`

This creates:

- `public.user_profiles`
- `public.posts`
- `public.post_reports`
- moderation fields on `posts` (`moderation_status`, `flagged_reason`, `moderated_at`, `moderated_by`)
- indexes
- update trigger
- RLS policies

## 3) Auth settings

In Supabase Auth:

- enable Email provider
- configure Email Confirm behavior as needed for your course

If email confirmation is enabled, users must verify email before full session usage.

## 4) Expected app behavior

- `/auth` creates a user in Supabase Auth.
- short profile fields are written to:
  - auth `user_metadata`
  - `public.user_profiles` (upsert)
- posting writes into `public.posts`.
- feed/profile read from `public.posts`.
- admin panel can set post status to `flagged`, `hidden`, or back to `active`.
- users can report posts from feed; admin can resolve/dismiss reports.

## 5) Optional SQL checks

```sql
select id, email, created_at from auth.users order by created_at desc limit 10;
select * from public.user_profiles order by created_at desc limit 10;
select * from public.posts order by created_at desc limit 20;
```
