#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const now = Date.now();
const random = Math.random().toString(36).slice(2, 8);
const email = `smoke-${now}-${random}@example.com`;
const password = 'SmokePass#123';

async function mustFetch(path, init = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, init);
  const body = await res.text();
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
  if (!register?.data?.email) throw new Error('register response missing data.email');
  console.log('[smoke] /api/auth/register ok');

  const login = await mustFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, password })
  });
  if (!login?.data?.email) throw new Error('login response missing data.email');
  console.log('[smoke] /api/auth/login ok');

  console.log('[smoke] success');
}

main().catch((err) => {
  console.error('[smoke] failed');
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
