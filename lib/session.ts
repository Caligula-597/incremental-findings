import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export type SessionRole = 'author' | 'editor';
export type SessionEditorRole = 'managing_editor' | 'review_editor';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  editor_role?: SessionEditorRole | null;
}

const COOKIE_NAME = 'if_session';
const devSessionSecret = randomBytes(32).toString('hex');

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
    if (parsed.editor_role && parsed.editor_role !== 'managing_editor' && parsed.editor_role !== 'review_editor') {
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
