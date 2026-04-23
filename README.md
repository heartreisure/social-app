# Social Vibe App

Mobile-first social web app built with Next.js, Supabase, and motion-rich UI.

## Deploy as public web app on GitHub Pages

### 1) Push repository to GitHub

Use a public repository.

### 2) Add repository variables

Open GitHub repository -> Settings -> Secrets and variables -> Actions -> Variables.

Add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEMO_USER_ID` (optional)

### 3) Enable GitHub Pages

Open Settings -> Pages.

- Source: **GitHub Actions**

### 4) Trigger deployment

Push to `main` (or `master`) and wait for workflow:

- `.github/workflows/deploy-pages.yml`

The app is exported statically and published from `out/`.

## Local development

```bash
npm install
npm run dev
```
