# Incremental Findings

Independent research archive website with editorial-style visual design.

## Positioning
This project is **not affiliated with Nature**. It only borrows a clean, publication-like aesthetic.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Next API routes + Supabase (Postgres)

## Features
- Public homepage (`/`) for published submissions
- Author submission portal (`/submit`)
- Editor panel (`/editor`) with status workflow
- APIs:
  - `GET/POST /api/submissions`
  - `PATCH /api/submissions/:id/status`
  - `POST /api/submissions/:id/publish` (compat alias)

## Required Supabase table
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
