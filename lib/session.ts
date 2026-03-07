import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export type SessionRole = 'author' | 'editor';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
}

const COOKIE_NAME = 'if_session';

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  return 'dev-only-session-secret-change-me-please-32chars';
}

function sign(payloadBase64: string) {
  return createHmac('sha256', getSessionSecret()).update(payloadBase64).digest('base64url');
}

export function buildSessionToken(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseSessionToken(token?: string): SessionUser | null {
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
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser;
    if (!parsed?.id || !parsed?.email || !parsed?.name || (parsed.role !== 'author' && parsed.role !== 'editor')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
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

export function getServerSessionUser(): SessionUser | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  return parseSessionToken(token);
}
