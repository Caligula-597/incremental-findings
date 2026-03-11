import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { buildSessionToken, setSessionCookie } from '@/lib/session';
import { guardRequest } from '@/lib/request-guard';

const DEFAULT_EDITOR_CODE = 'review-demo';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim() || 'Editorial Reviewer';
    const code = String(body.editor_code ?? '').trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'email and editor_code are required' }, { status: 400 });
    }


    const editorGuard = await guardRequest(request, {
      route: '/api/auth/editor-login',
      bucketPrefix: 'auth-editor-login',
      bucketKeySuffix: email || 'unknown',
      maxRequests: Number(process.env.EDITOR_LOGIN_RATE_LIMIT_MAX ?? '10') || 10,
      windowMs: Number(process.env.EDITOR_LOGIN_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many editor login attempts. Please try again later.'
    });
    if (editorGuard.response) {
      return editorGuard.response;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !process.env.EDITOR_ACCESS_CODE) {
      return NextResponse.json(
        { error: 'EDITOR_ACCESS_CODE must be configured in production' },
        { status: 503 }
      );
    }

    const expectedCode = process.env.EDITOR_ACCESS_CODE ?? DEFAULT_EDITOR_CODE;
    if (code !== expectedCode) {
      return NextResponse.json({ error: 'Invalid editor access code' }, { status: 401 });
    }

    const sessionUser = {
      id: randomUUID(),
      email,
      name,
      role: 'editor' as const
    };

    setSessionCookie(buildSessionToken(sessionUser));
    return NextResponse.json({
      data: {
        ...sessionUser,
        session_token: randomUUID()
      },
      mode: process.env.EDITOR_ACCESS_CODE ? 'env' : 'demo-default'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
