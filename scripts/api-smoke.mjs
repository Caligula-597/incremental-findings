#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const now = Date.now();
const random = Math.random().toString(36).slice(2, 8);
const email = `smoke-${now}-${random}@example.com`;
const password = 'SmokePass#123';

let cookieHeader = '';

async function mustFetch(path, init = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...(init.headers || {}) };
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const res = await fetch(url, { ...init, headers });
  const body = await res.text();

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const nextCookie = setCookie.split(';')[0];
    cookieHeader = cookieHeader ? `${cookieHeader}; ${nextCookie}` : nextCookie;
  }
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} ${url}\n${body.slice(0, 400)}`);
  }
  return body ? JSON.parse(body) : {};
}

async function main() {
  console.log(`[smoke] baseUrl=${baseUrl}`);

  const health = await mustFetch('/api/public/supabase-health');
  if (!health?.runtime?.mode) throw new Error('supabase-health missing runtime.mode');
  console.log('[smoke] /api/public/supabase-health ok');

  const standards = await mustFetch('/api/public/journal-standards');
  if (!Array.isArray(standards?.data?.sections) || standards.data.sections.length < 4) {
    throw new Error('journal-standards sections missing/invalid');
  }
  console.log('[smoke] /api/public/journal-standards ok');

  const integrations = await mustFetch('/api/public/integrations/requirements');
  if (!Array.isArray(integrations?.providers)) throw new Error('integrations providers missing');
  console.log('[smoke] /api/public/integrations/requirements ok');

  const register = await mustFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke User',
      email,
      password,
      username: `smoke_${random}`
    })
  });
  if (!register?.data?.email || !register?.requires_verification) {
    throw new Error('register response missing email verification payload');
  }
  console.log('[smoke] /api/auth/register ok');

  const verificationCode = register.debug_verification_code;
  if (!verificationCode) {
    throw new Error('register response missing debug_verification_code; smoke requires log-only verification mode');
  }

  const verifyEmail = await mustFetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code: verificationCode })
  });
  if (!verifyEmail?.data?.email) throw new Error('verify-email response missing data.email');
  console.log('[smoke] /api/auth/verify-email ok');

  const login = await mustFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, password })
  });
  if (!login?.data?.email) throw new Error('login response missing data.email');
  console.log('[smoke] /api/auth/login ok');

  const session = await mustFetch('/api/auth/session');
  if (!session?.data?.email) throw new Error('session response missing data.email');
  console.log('[smoke] /api/auth/session ok');

  const editorLogin = await mustFetch('/api/auth/editor-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `editor-${random}@example.com`, name: 'Smoke Editor', editor_code: process.env.SMOKE_EDITOR_CODE || 'review-demo' })
  });
  if (!editorLogin?.data?.role || editorLogin.data.role !== 'editor') {
    throw new Error('editor-login response missing editor role');
  }
  console.log('[smoke] /api/auth/editor-login ok');

  console.log('[smoke] success');
}

main().catch((err) => {
  console.error('[smoke] failed');
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
