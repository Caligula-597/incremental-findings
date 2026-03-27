import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase';

export type SessionRole = 'author' | 'editor';
export type SessionEditorRole = 'managing_editor' | 'review_editor';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  editor_role?: SessionEditorRole | null;
}

interface SessionTokenPayload extends SessionUser {
  sid: string;
  iat: number;
  exp: number;
}

interface SessionStateRecord {
  sid: string;
  user_id: string;
  email: string;
  name: string;
  role: SessionRole;
  editor_role: SessionEditorRole | null;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string;
}

const COOKIE_NAME = 'if_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const devSessionSecret = randomBytes(32).toString('hex');
const runtimeSessionStates = new Map<string, SessionStateRecord>();

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function toIsoFromUnix(seconds: number) {
  return new Date(seconds * 1000).toISOString();
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set with at least 32 characters in production.');
  }

  return devSessionSecret;
}

function sign(payloadBase64: string) {
  return createHmac('sha256', getSessionSecret()).update(payloadBase64).digest('base64url');
}

function buildTokenPayload(user: SessionUser, sid: string, iat = nowUnixSeconds(), ttlSeconds = SESSION_TTL_SECONDS): SessionTokenPayload {
  return {
    ...user,
    sid,
    iat,
    exp: iat + ttlSeconds
  };
}

function encodeToken(payload: SessionTokenPayload) {
  const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function decodeSessionToken(token?: string): SessionTokenPayload | null {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionTokenPayload;
    if (!parsed?.id || !parsed?.email || !parsed?.name || !parsed?.sid) {
      return null;
    }
    if (parsed.role !== 'author' && parsed.role !== 'editor') {
      return null;
    }
    if (parsed.editor_role && parsed.editor_role !== 'managing_editor' && parsed.editor_role !== 'review_editor') {
      return null;
    }
    if (!Number.isFinite(parsed.iat) || !Number.isFinite(parsed.exp)) {
      return null;
    }
    if (parsed.exp <= nowUnixSeconds()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function persistSession(record: SessionStateRecord) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const insert = await supabase.from('session_states').insert(record);
    if (!insert.error) {
      return;
    }
  }

  runtimeSessionStates.set(record.sid, record);
}

async function getSessionStateBySid(sid: string): Promise<SessionStateRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const row = await supabase.from('session_states').select('*').eq('sid', sid).maybeSingle();
    if (!row.error && row.data) {
      return row.data as SessionStateRecord;
    }
  }

  return runtimeSessionStates.get(sid) ?? null;
}

async function touchSessionState(sid: string, nowIso: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await supabase.from('session_states').update({ last_seen_at: nowIso }).eq('sid', sid);
  }

  const existing = runtimeSessionStates.get(sid);
  if (existing) {
    existing.last_seen_at = nowIso;
  }
}

export function buildSessionToken(user: SessionUser) {
  const sid = randomUUID();
  return encodeToken(buildTokenPayload(user, sid));
}

export async function issueSessionToken(user: SessionUser) {
  const sid = randomUUID();
  const payload = buildTokenPayload(user, sid);
  const record: SessionStateRecord = {
    sid,
    user_id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    editor_role: user.editor_role ?? null,
    issued_at: toIsoFromUnix(payload.iat),
    expires_at: toIsoFromUnix(payload.exp),
    revoked_at: null,
    last_seen_at: new Date().toISOString()
  };

  await persistSession(record);
  return encodeToken(payload);
}

export function parseSessionToken(token?: string): SessionUser | null {
  const payload = decodeSessionToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    editor_role: payload.editor_role ?? null
  };
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0)
  });
}

export async function revokeCurrentSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = decodeSessionToken(token);
  if (!payload?.sid) {
    return;
  }

  const nowIso = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await supabase.from('session_states').update({ revoked_at: nowIso, last_seen_at: nowIso }).eq('sid', payload.sid);
  }

  const runtimeRecord = runtimeSessionStates.get(payload.sid);
  if (runtimeRecord) {
    runtimeRecord.revoked_at = nowIso;
    runtimeRecord.last_seen_at = nowIso;
  }
}

export async function getServerSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = decodeSessionToken(token);
  if (!payload) {
    return null;
  }

  const state = await getSessionStateBySid(payload.sid);
  if (!state) {
    return null;
  }

  const nowIso = new Date().toISOString();
  if (state.revoked_at || state.expires_at <= nowIso) {
    return null;
  }

  await touchSessionState(payload.sid, nowIso);

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    editor_role: payload.editor_role ?? null
  };
}
