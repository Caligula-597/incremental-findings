import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { buildSessionToken, setSessionCookie } from '@/lib/session';
import { guardRequest } from '@/lib/request-guard';
import { countRecentSecurityEvents, recordSecurityEvent } from '@/lib/security-service';

const DEFAULT_EDITOR_CODE = 'review-demo';



async function maybeRecordEditorLoginFailureAlert(email: string) {
  const threshold = Number(process.env.EDITOR_LOGIN_ALERT_THRESHOLD ?? '5') || 5;
  const windowMs = Number(process.env.EDITOR_LOGIN_ALERT_WINDOW_MS ?? '300000') || 300000;

  const failureCount = await countRecentSecurityEvents({
    route: '/api/auth/editor-login',
    detailPrefix: 'editor_login_invalid_',
    actorEmail: email || null,
    windowMs
  });

  if (failureCount >= threshold) {
    await recordSecurityEvent({
      kind: 'alert',
      actorEmail: email || null,
      route: '/api/auth/editor-login',
      detail: `editor_login_failure_threshold_exceeded:count_${failureCount}`
    });
  }
}

function parseEditorCodes() {
  const primary = String(process.env.EDITOR_ACCESS_CODE ?? '').trim();
  const rolloverRaw = String(process.env.EDITOR_ACCESS_CODE_ROLLOVER ?? '').trim();

  const rolloverCodes = rolloverRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const merged = [primary, ...rolloverCodes].filter(Boolean);
  if (merged.length === 0) {
    return [DEFAULT_EDITOR_CODE];
  }

  return Array.from(new Set(merged));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim() || 'Editorial Reviewer';
    const code = String(body.editor_code ?? '').trim();

    if (!email || !code) {
      await recordSecurityEvent({
        kind: 'alert',
        actorEmail: email || null,
        route: '/api/auth/editor-login',
        detail: 'editor_login_invalid_payload'
      });
      await maybeRecordEditorLoginFailureAlert(email);
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

    const acceptedCodes = parseEditorCodes();
    const matchedCodeIndex = acceptedCodes.findIndex((candidate) => code === candidate);
    if (matchedCodeIndex < 0) {
      await recordSecurityEvent({
        kind: 'alert',
        actorEmail: email,
        route: '/api/auth/editor-login',
        detail: 'editor_login_invalid_code'
      });
      await maybeRecordEditorLoginFailureAlert(email);
      return NextResponse.json({ error: 'Invalid editor access code' }, { status: 401 });
    }

    const sessionUser = {
      id: randomUUID(),
      email,
      name,
      role: 'editor' as const
    };

    setSessionCookie(buildSessionToken(sessionUser));
    await recordSecurityEvent({
      kind: 'alert',
      actorEmail: email,
      route: '/api/auth/editor-login',
      detail: `editor_login_success:slot_${matchedCodeIndex}`
    });

    return NextResponse.json({
      data: sessionUser,
      mode: process.env.EDITOR_ACCESS_CODE ? 'env' : 'demo-default',
      credential_slot: matchedCodeIndex
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
