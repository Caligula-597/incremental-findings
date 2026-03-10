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

## Extra implementation guide
- Supabase 团队对接问题清单：`docs/supabase-team-handoff-checklist.md`
- Supabase 团队回复模板：`docs/supabase-team-response-template.md`
- RLS 强化与策略示例：`docs/rls-hardening-guide.md`
- Supabase 对接完整指引：`docs/supabase-integration-guide.md`
- 发布门禁清单：`docs/release-checklist.md`
- UAT 执行手册：`docs/uat-runbook.md`
- 运维治理手册：`docs/operations-runbook.md`
- CI 质量门禁：`.github/workflows/quality-gate.yml`

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
- `POST /api/submissions/:id/doi` (assign temporary publication identifier; replace with real DOI provider later)
- `GET/POST /api/submissions/:id/revisions` (submission version history baseline)
- `POST /api/reviews/assign` (editor assigns reviewer; enforces COI/review policy constraints)
- `POST /api/reviews/invitations/:id/respond` (reviewer accepts/declines)
- `POST /api/reviews/:id/submit-report` (review report submission)
- `POST /api/submissions/:id/decision` (editor decision endpoint)
- `GET /api/production/:id` (editor production timeline)
- `POST /api/production/:id/start` (start production workflow)
- `POST /api/production/:id/proof` (mark proof-ready stage)
- `POST /api/production/:id/publish-package` (final publication package + status sync)
- `POST /api/security/risk-check` (risk scoring for routes/IPs)
- `GET /api/security/events` (editor security event feed)
- `POST /api/security/block` (editor block IP/range placeholder)
- `GET /api/indexing/export` (editor indexing export jobs)
- `POST /api/indexing/export/:provider` (queue metadata export to provider)
- `GET /api/public/journal-profile` (public mission + live metrics)
- `GET /api/public/review-policy` (current review model/COI/SLA defaults)
- `GET /api/public/journal-standards` (peer review / ethics / QA / metadata standard baseline)
- `GET /api/public/submissions` (public article index feed)
- `GET /api/public/submissions/:id/citation?format=bibtex|ris|csl-json|jats` (citation/metadata export)
- `GET /api/public/integrations/requirements` (external API readiness + missing env checklist)
- `GET /api/public/platform-readiness` (feature gap map + priority milestones)
- `GET /api/public/module-readiness` (implemented-module verification snapshot)
- `GET /api/public/perf-hints` (runtime lag diagnosis hints + mitigations)
- `GET /api/public/professionalization-plan` (current implementation depth + prioritized next hardening actions)
- `GET /api/public/backend-recommendation` (backend integration options + current config snapshot)
- `GET /api/public/supabase-health` (current runtime mode + key config diagnostics)
- `GET /api/public/operations-governance` (migration/audit retention/preservation governance snapshot)
- `GET/POST /api/ethics/cases` (editor ethics case queue)
- `PATCH /api/ethics/cases/:id` (editor ethics case status/resolution update)

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
  username TEXT,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_username_key
  ON user_accounts(username)
  WHERE username IS NOT NULL;

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


CREATE TABLE IF NOT EXISTS review_assignments (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  editor_email TEXT NOT NULL,
  round_index INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES review_assignments(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidential_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS editor_decisions (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  mapped_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  editor_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS production_jobs (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  editor_email TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publication_packages (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  package_url TEXT NOT NULL,
  checksum TEXT,
  editor_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL,
  actor_email TEXT,
  ip TEXT,
  route TEXT,
  detail TEXT NOT NULL,
  risk_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY,
  ip TEXT NOT NULL,
  route TEXT NOT NULL,
  score INT NOT NULL,
  decision TEXT NOT NULL,
  reasons TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ip_rate_limits (
  id UUID PRIMARY KEY,
  ip TEXT NOT NULL,
  route TEXT NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS indexing_exports (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metadata_snapshots (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
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

# Optional public client keys (for browser reads only)
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
DOI_PLACEHOLDER_PREFIX=if-tmp
CROSSREF_API_BASE=
CROSSREF_MEMBER_ID=
CROSSREF_USERNAME=
CROSSREF_PASSWORD=
DATACITE_REPOSITORY_ID=
DATACITE_API_TOKEN=
UNPAYWALL_EMAIL=
ALTMETRIC_API_KEY=
REVIEW_MODEL=single_blind
REQUIRE_COI_DISCLOSURE=true
ENFORCE_REVIEWER_AUTHOR_SEPARATION=true
DEFAULT_REVIEW_DUE_DAYS=21
```

> Server-side persistent writes require both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
> When either one is missing, the project runs in memory fallback mode (safe for local demo only).
> In `NODE_ENV=production`, missing integration/security keys are logged as configuration warnings and server data access degrades to safe fallback mode where possible; set `SESSION_SECRET`, `EDITOR_ACCESS_CODE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for full production behavior.

## ORCID troubleshooting
- Open `/api/orcid/diagnostics` to verify callback/credential wiring without exposing secrets.
- When token exchange fails, `/api/orcid/callback` returns diagnostic metadata (fingerprints + callback match checks).

## Supabase migrations included in repo
- `supabase/migrations/202603090001_auth_alignment_and_rls.sql`: auth contract alignment (`username` + identity-table RLS baseline).
- `supabase/migrations/202603090002_submissions_normalization_rls_audit.sql`: submissions ownership/RLS hardening, `submission_authors`, audit trigger, and `vw_submissions_for_user`.
- `supabase/migrations/202603090003_ethics_cases_and_policy_support.sql`: publication ethics case table, indexes and service-role RLS baseline.
- `supabase/migrations/202603090004_audit_archive_and_ops.sql`: audit archive table + archive function for retention policy.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

Smoke test (requires running app):
```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke
```

Migration inventory check:
```bash
npm run verify:migrations
```


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
- 核心模块已全部落地，下一步进入质量提升（自动化测试、可观测性、真实外部服务接入）阶段。
- 全量模块状态可通过 `GET /api/public/platform-readiness` 与 `GET /api/public/module-readiness` 交叉核对。


## Recently completed foundation module
- ✅ Notification baseline is now implemented:
  - template list: `GET /api/notifications/templates`
  - render preview: `POST /api/notifications/preview`
  - send/read jobs: `GET/POST /api/notifications/send`
- ✅ Submission versioning baseline is now implemented:
  - revision list/create: `GET/POST /api/submissions/:id/revisions`
  - stores `revision_summary`, `version_index`, status snapshot, optional metadata/file URL
- ✅ Peer review lifecycle baseline is now implemented:
  - assign reviewer: `POST /api/reviews/assign`
  - invitation response: `POST /api/reviews/invitations/:id/respond`
  - review report submit: `POST /api/reviews/:id/submit-report`
  - editor decision: `POST /api/submissions/:id/decision`
- ✅ Production pipeline baseline is now implemented:
  - timeline read: `GET /api/production/:id`
  - stage transitions: `POST /api/production/:id/start`, `POST /api/production/:id/proof`
  - final package publish: `POST /api/production/:id/publish-package`
- ✅ Security anti-abuse baseline is now implemented:
  - risk check: `POST /api/security/risk-check`
  - security feed: `GET /api/security/events`
  - block operation: `POST /api/security/block`
- ✅ Indexing export baseline is now implemented:
  - citation formats: `format=bibtex|ris|csl-json`
  - export queue: `GET /api/indexing/export` + `POST /api/indexing/export/:provider`
- Current provider mode is `log-only` by default and switches to `resend-ready` when `RESEND_API_KEY` exists.


## Performance notes (运行卡顿排查)
- 开发模式下首次访问页面会触发 Next.js 编译，出现短暂卡顿属于常见现象。
- 建议用 `npm run build && npm run start` 评估真实性能。
- 可通过 `GET /api/public/perf-hints` 获取可机器读取的性能排查建议。

## Backend recommendation (当前后端建议)
- **优先方案**：先完整接入 Supabase（Postgres + Storage），因为现有代码已大量兼容该模式。
- 在正式环境中建议逐步减少 memory fallback 的写路径，仅保留本地开发兜底。
- 可调用 `GET /api/public/backend-recommendation` 获取机器可读的分阶段建议与当前配置状态。

## Chinese content baseline
- Header 支持中英文切换按钮（URL 参数 `lang=zh|en`），并在站内导航中保持语言上下文。
- 首页与社区页关键标题/导航已接入双语文案。
- 登录页、账户页、投稿页、论文卡片与论文详情页已接入双语文案，并保持 `lang` 参数透传。
- 后续继续按模块推进：编辑后台状态文案、通知模板与系统消息双语化。
