# Editor login backend implementation guide

This document consolidates deployment-ready patterns for:
- `POST /api/auth/editor-login`
- `GET /api/auth/session`

It also includes migration-ready options for one-time editor tokens and a SQL path to disable editor password login when you only want access-code login.

## 1) Current production behavior in this repo

- Editor login uses `email + editor_code`.
- The API issues a signed HttpOnly cookie (`if_session`) with role `editor`.
- Production requires `EDITOR_ACCESS_CODE`; if missing, API returns `503`.
- Login attempts are rate-limited and security events are recorded.

Relevant routes:
- `app/api/auth/editor-login/route.ts`
- `app/api/auth/session/route.ts`

---

## 2) Environment variable policy (prod vs dev)

### Production (required)
- `SESSION_SECRET` (>= 32 chars)
- `EDITOR_ACCESS_CODE`

### Production (optional for rotation)
- `EDITOR_ACCESS_CODE_ROLLOVER` (optional, comma-separated old codes during rotation)

### Security alert tuning (recommended)
- `EDITOR_LOGIN_ALERT_THRESHOLD` (default: 5)
- `EDITOR_LOGIN_ALERT_WINDOW_MS` (default: 300000 / 5 minutes)

### Local development
- You may omit `EDITOR_ACCESS_CODE` and use the built-in fallback (`review-demo`) only in non-production.

Recommended deployment rule:
- `NODE_ENV=production` must always provide `EDITOR_ACCESS_CODE`.

---

## 3) Example: Node/Express implementation

```ts
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const app = express();
app.use(express.json());
app.use(cookieParser());

const COOKIE_NAME = 'if_session';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const EDITOR_ACCESS_CODE = process.env.EDITOR_ACCESS_CODE;
const EDITOR_ACCESS_CODE_ROLLOVER = process.env.EDITOR_ACCESS_CODE_ROLLOVER || '';

function sign(payloadBase64: string) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('base64url');
}

function makeSession(user: { id: string; email: string; name: string; role: 'editor' | 'author' }) {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function parseSession(token?: string) {
  if (!token?.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

const editorLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const EDITOR_LOGIN_ALERT_THRESHOLD = Number(process.env.EDITOR_LOGIN_ALERT_THRESHOLD || '5');
const EDITOR_LOGIN_ALERT_WINDOW_MS = Number(process.env.EDITOR_LOGIN_ALERT_WINDOW_MS || '300000');

app.post('/api/auth/editor-login', editorLimiter, (req, res) => {
  if (process.env.NODE_ENV === 'production' && !EDITOR_ACCESS_CODE) {
    return res.status(503).json({ error: 'EDITOR_ACCESS_CODE must be configured in production' });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.editor_code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'email and editor_code are required' });

  const acceptedCodes = [EDITOR_ACCESS_CODE, ...EDITOR_ACCESS_CODE_ROLLOVER.split(',').map(s => s.trim())]
    .filter(Boolean) as string[];
  const expectedCodes = acceptedCodes.length > 0 ? acceptedCodes : ['review-demo'];
  if (!expectedCodes.includes(code)) return res.status(401).json({ error: 'Invalid editor access code' });

  const session = makeSession({ id: crypto.randomUUID(), email, name: 'Editorial Reviewer', role: 'editor' });
  res.cookie(COOKIE_NAME, session, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  return res.json({ data: { email, role: 'editor' } });
});

app.get('/api/auth/session', (req, res) => {
  const user = parseSession(req.cookies[COOKIE_NAME]);
  if (!user) return res.status(401).json({ data: null });
  return res.json({ data: user });
});
```

---

## 4) Example: Supabase Edge Function shape

Use Edge Function as a gateway only if you still keep server-side secret handling.
- Validate `EDITOR_ACCESS_CODE` from function secrets.
- Set cookie on your app domain through your app backend (recommended), or return short-lived token for app backend to exchange.

Minimal flow:
1. Edge Function validates `email + editor_code`.
2. Edge Function returns signed short-lived token.
3. Next.js backend verifies token and sets `if_session` HttpOnly cookie.

This avoids exposing cookie-signing secret outside your app backend.

---

## 5) Migration option: one-time token (safer than static code)

### Table
```sql
create table if not exists public.editor_access_tokens (
  id uuid primary key default uuid_generate_v4(),
  token_hash text not null unique,
  issued_to_email text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_editor_access_tokens_expires_at
  on public.editor_access_tokens(expires_at);
```

### Usage pattern
- Generate random token, hash with SHA-256 or scrypt.
- Store only hash in DB.
- On login, hash provided token and compare.
- If matched and not expired/used, mark `used_at=now()`.

---

## 6) SQL option: disable password login for editors (access-code only)

If your product policy is: *editor accounts should not use password login*, keep account identity and remove password usability for editor rows.

> Adjust column names to your real schema (`role`, `password_hash`, etc.).

```sql
-- Example: mark editors as access-code-only
alter table public.user_accounts
  add column if not exists editor_code_only boolean default false;

update public.user_accounts
set editor_code_only = true,
    password_hash = null
where role = 'editor';
```

If `password_hash` is `not null`, use a dedicated invalid hash marker instead of `null`.

```sql
update public.user_accounts
set editor_code_only = true,
    password_hash = 'disabled:editor_code_only'
where role = 'editor';
```

Then enforce this in login code:
- reject password login when `editor_code_only = true`.

---

## 7) Auditing recommendations

For editor login endpoint, record at least:
- `editor_login_invalid_payload`
- `editor_login_invalid_code`
- `editor_login_success`

Include route, actor email, timestamp, and client IP when possible.



## 8) Editor application + invite workflow (new)

To avoid direct public editor signup:
- Authors submit an application via `POST /api/editor/applications`
- Existing editors review applications and issue manual invite codes via `POST /api/editor/invites`
- Invited users then log in through `/api/auth/editor-login` using `email + invite_code`

Recommended tables:
- `editor_applications`
- `editor_invites`

This model supports both:
1. environment access codes (`EDITOR_ACCESS_CODE`, rollover)
2. email-bound invite codes (manual editorial approval)
