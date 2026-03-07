# Incremental Findings

Independent research archive website with editorial-style visual design.

## Positioning
This project is **not affiliated with Nature**. It only borrows a clean, publication-like aesthetic.

## Current product structure
- Public homepage with discipline and article-type taxonomy filters (`/`)
- Submission portal with complete package workflow (`/submit`)
- Editorial workspace (`/editor`) covering in-progress, under-review and published flows (editor login required)
- Account center and login scaffolding (`/account`, `/login`)
- Public mission and community roadmap page (`/community`)

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
- `POST /api/auth/editor-login`
- `GET /api/auth/session`
- `GET /api/orcid/start`
- `GET /api/orcid/callback`
- `GET /api/orcid/status`
- `GET /api/orcid/diagnostics` (safe env/runtime checks for ORCID troubleshooting)
- `GET /api/notifications/templates` (editor templates list)
- `POST /api/notifications/preview` (editor preview rendered content)
- `GET/POST /api/notifications/send` (editor queue/read notification jobs)
- `GET/POST /api/submissions`
- `POST /api/submissions/complete` (metadata + agreements + files + SHA-256 integrity manifest)
- `PATCH /api/submissions/:id/status`
- `POST /api/submissions/:id/publish` (compat alias)
- `POST /api/submissions/:id/doi` (assign DOI for published submissions)
- `GET/POST /api/submissions/:id/revisions` (submission version history baseline)
- `GET /api/public/journal-profile` (public mission + live metrics)
- `GET /api/public/submissions` (public article index feed)
- `GET /api/public/submissions/:id/citation?format=bibtex` (citation export)
- `GET /api/public/integrations/requirements` (external API readiness + missing env checklist)
- `GET /api/public/platform-readiness` (feature gap map + priority milestones)

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


CREATE TABLE IF NOT EXISTS submission_versions (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  version_index INT NOT NULL,
  status_snapshot TEXT NOT NULL,
  file_url TEXT,
  revision_summary TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Alternative minimal schema (also supported by current code):
```sql
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orcid_links (
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  orcid_id TEXT UNIQUE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES user_accounts(id),
  title TEXT NOT NULL,
  abstract TEXT,
  status TEXT DEFAULT 'pending',
  category TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```



## Secret handling (important)
- Put real credentials in `.env.local` (already gitignored) or `secrets/orcid.local` (gitignored).
- Commit only `.env.example` with empty placeholders.
- If a secret was ever exposed publicly, rotate it immediately in ORCID/Supabase console.

## Environment variables
Create `.env.local`:
```bash
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# If service key is not provided, server will fallback to:
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional ORCID OAuth (needed for real ORCID token exchange)
ORCID_CLIENT_ID=xxx
ORCID_CLIENT_SECRET=xxx
ORCID_REDIRECT_URI=http://localhost:3000/api/orcid/callback
EDITOR_ACCESS_CODE=your_editor_access_code
SESSION_SECRET=at_least_32_chars_random_secret
DOI_PREFIX=10.5555
DOI_REGISTRANT=incremental-findings
CROSSREF_API_BASE=
CROSSREF_MEMBER_ID=
CROSSREF_USERNAME=
CROSSREF_PASSWORD=
DATACITE_REPOSITORY_ID=
DATACITE_API_TOKEN=
UNPAYWALL_EMAIL=
ALTMETRIC_API_KEY=
```

> Authentication persistence uses Supabase when any supported server key pair exists.
> Memory fallback is only used when Supabase is completely unconfigured.

## ORCID troubleshooting
- Open `/api/orcid/diagnostics` to verify callback/credential wiring without exposing secrets.
- When token exchange fails, `/api/orcid/callback` returns diagnostic metadata (fingerprints + callback match checks).

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000


## Editor login
- Use `/login` and choose **Editor Log in**.
- In local demo mode (without env), default editor code is `review-demo`.
- In production, set `EDITOR_ACCESS_CODE` in environment variables.


## Session and authorization baseline
- Login/register/editor-login now issue a signed HttpOnly session cookie (`if_session`).
- `PATCH /api/submissions/:id/status` and `POST /api/submissions/:id/publish` require editor role from server-side session.
- `POST /api/submissions/complete` requires a logged-in session and enforces submission identity match.
- Password hashing uses `scrypt` with backward-compatible migration for existing SHA-256 hashes.

- Editorial workflow transition validation is now enforced server-side (e.g., prevents invalid direct transitions).


## DOI assignment baseline
- DOI can only be assigned when a submission is already `published`.
- `POST /api/submissions/:id/doi` requires editor session and writes DOI back into submission record.
- Current implementation provides deterministic DOI generation and keeps a provider flag (`mock` or `crossref-ready`) for later real registry handoff.


## Public journal plan
- `/community` publishes mission, public-facing programs, and measurable annual targets.
- `GET /api/public/journal-profile` exposes roadmap and live operational metrics for transparency.


## Single-site modular architecture
- This project keeps one website entrypoint, while splitting functionality by bounded modules (auth, submissions, editorial, DOI, public profile, citation export).
- This mirrors how many journal platforms evolve: one domain for users, modular services/routes behind it.
- Added `app/sitemap.ts` and `app/robots.ts` for publication discoverability and crawler control.

## External APIs still needed for production-grade journal operation
- **Identity**: ORCID (already scaffolded), plus optional ROR for organization normalization.
- **DOI registration**: Crossref Deposit API (journal articles) and optional DataCite (datasets/software).
- **Discovery/metadata enrichment**: OpenAlex + Unpaywall to enrich indexing and OA visibility.
- **Impact/monitoring**: optional altmetrics providers for non-citation signal.
- **Long-term preservation**: CLOCKSS/Portico-style archival integration for formal continuity.
- Current integration roadmap is visible in `/community` and machine-readable via `GET /api/public/integrations/requirements`.


## What is still missing before "real-journal" readiness
- **P0**: Peer review lifecycle (assignment/invitation/report/decision).
- **P1**: Production workflow (copyedit/proof/publish package) with DOI handoff receipts.
- **P1**: Security hardening (rate limits, risk events, abuse controls).
- **P1**: Metadata exports (RIS/CSL-JSON and indexing export jobs).
- All modules are exposed in machine-readable form via `GET /api/public/platform-readiness`.


## Recently completed foundation module
- ✅ Notification baseline is now implemented:
  - template list: `GET /api/notifications/templates`
  - render preview: `POST /api/notifications/preview`
  - send/read jobs: `GET/POST /api/notifications/send`
- ✅ Submission versioning baseline is now implemented:
  - revision list/create: `GET/POST /api/submissions/:id/revisions`
  - stores `revision_summary`, `version_index`, status snapshot, optional metadata/file URL
- Current provider mode is `log-only` by default and switches to `resend-ready` when `RESEND_API_KEY` exists.
