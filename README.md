# Incremental Findings

A minimal but standard web architecture for a Nature-style research homepage.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Next API routes + Supabase (Postgres)

## Features
- Public Reader homepage (`/`)
- Author submission portal (`/submit`)
- Editor panel (`/editor`)
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

> If env vars are missing, the app falls back to in-memory mock data for UI development.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000
