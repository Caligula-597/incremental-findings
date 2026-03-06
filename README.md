# Incremental Findings

Independent research archive website with editorial-style visual design.

## Positioning
This project is **not affiliated with Nature**. It only borrows a clean, publication-like aesthetic.

## Current product structure
- Public homepage with discipline and article-type taxonomy filters (`/`)
- Submission portal with required classification fields (`/submit`)
- Editorial workspace (`/editor`) covering in-progress, under-review and published flows
- Account center and login scaffolding (`/account`, `/login`)

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Next API routes + Supabase (Postgres)

## APIs
- `GET/POST /api/submissions`
- `PATCH /api/submissions/:id/status`
- `POST /api/submissions/:id/publish` (compat alias)

## Required Supabase table
Base table (already supported):
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  abstract TEXT,
  status TEXT DEFAULT 'pending',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Recommended taxonomy extension (optional but advised):
```sql
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS discipline TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS article_type TEXT;
```

## Environment variables
Create `.env.local`:
```bash
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> If env vars are missing, the app falls back to empty in-memory data for local UI development.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000
