# Production Hardening Checklist

This document captures publish-readiness checks for GitHub Pages + Supabase.

## Runtime configuration validation

- Required public environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- CI gate: `npm run verify:prod`
  - fails when required variables are missing
  - fails when URL is not HTTPS
  - fails when anon key appears invalid (too short)

## Deployment safety checks

- GitHub Actions workflow runs `verify:prod` before `next build`.
- Static export target remains `out/` and upload step uses that exact directory.
- Base path/asset prefix logic in `next.config.mjs` supports repo pages and user/org pages.

## Moderation safety baseline

- Auto-escalation threshold is centralized in `lib/moderation-policy.ts`.
- Posts are auto-flagged only when open reports >= 5 and post is not already flagged/hidden.
- Admin panel references the shared threshold to prevent policy drift.

## Manual pre-release verification

1. Run `npm run test:run` locally.
2. Run `npm run verify:prod` with production-like variables.
3. Confirm GitHub repository variables are present.
4. Trigger deployment and verify feed/profile/auth/admin routes load from Pages.
