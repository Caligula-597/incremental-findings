# Incremental Findings

Independent research archive website with editorial-style visual design.

## Positioning
This project is **not affiliated with Nature**. It only borrows a clean, publication-like aesthetic.

## Current product structure
- Public homepage with discipline and article-type taxonomy filters (`/`)
- Submission portal with complete package workflow (`/submit`)
- Editorial workspace (`/editor`) covering in-progress, under-review and published flows
- Account center and login scaffolding (`/account`, `/login`)

## What is implemented now
- Email account register/login API (memory fallback if DB table unavailable)
- ORCID connect flow scaffolding (`/api/orcid/start`, `/api/orcid/callback`, `/api/orcid/status`)
- Author agreements + terms version capture in submission flow
- Package upload support: manuscript PDF + cover letter + optional supporting files
- Compliance records:
  - `submission_files`
  - `consent_logs`
  - `audit_logs`

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Next API routes + Supabase (Postgres/Storage)

## APIs
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/orcid/start`
- `GET /api/orcid/callback`
- `GET /api/orcid/status`
- `GET/POST /api/submissions`
- `POST /api/submissions/complete` (metadata + agreements + files)
- `PATCH /api/submissions/:id/status`
- `POST /api/submissions/:id/publish` (compat alias)

## Required Supabase table
Base submissions table:
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

Recommended taxonomy extension:
```sql
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS discipline TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS article_type TEXT;
```

## Compliance/identity tables (recommended)
```sql
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orcid_links (
  user_email TEXT PRIMARY KEY,
  orcid_id TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_files (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  file_kind TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  author_warranty BOOLEAN NOT NULL,
  originality_warranty BOOLEAN NOT NULL,
  ethics_warranty BOOLEAN NOT NULL,
  privacy_ack BOOLEAN NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_email TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment variables
Create `.env.local`:
```bash
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional ORCID OAuth (needed for real ORCID token exchange)
ORCID_CLIENT_ID=xxx
ORCID_CLIENT_SECRET=xxx
ORCID_REDIRECT_URI=http://localhost:3000/api/orcid/callback
```

> If env vars/tables are missing, app continues with memory fallback and returns warnings for skipped persistence.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000
