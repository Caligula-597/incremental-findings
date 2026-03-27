import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { issueSessionToken, SessionEditorRole, setSessionCookie } from '@/lib/session';
import { canUseManagingEditorCode } from '@/lib/editor-workspace-service';
import { guardRequest } from '@/lib/request-guard';
import { countRecentSecurityEvents, recordSecurityEvent } from '@/lib/security-service';
import { validateAndConsumeEditorInvite } from '@/lib/editor-access';

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
  return Array.from(new Set(merged));
}

function parseRequestedEditorRole(value: unknown): SessionEditorRole | null {
  const role = String(value ?? '').trim().toLowerCase();
  if (role === 'managing_editor' || role === 'review_editor') {
    return role;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim() || 'Editorial Reviewer';
    const editorCode = String(body.editor_code ?? '').trim();
    const inviteCode = String(body.invite_code ?? '').trim();
    const requestedEditorRole = parseRequestedEditorRole(body.editor_role);

    if (!email || (!editorCode && !inviteCode)) {
      await recordSecurityEvent({
        kind: 'alert',
        actorEmail: email || null,
        route: '/api/auth/editor-login',
        detail: 'editor_login_invalid_payload'
      });
      await maybeRecordEditorLoginFailureAlert(email);
      return NextResponse.json({ error: 'email and (editor_code or invite_code) are required' }, { status: 400 });
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

    const acceptedCodes = parseEditorCodes();
    if (acceptedCodes.length === 0) {
      await recordSecurityEvent({
        kind: 'alert',
        actorEmail: email || null,
        route: '/api/auth/editor-login',
        detail: 'editor_login_blocked_missing_editor_access_code'
      });
    }
    const matchedCodeIndex = editorCode ? acceptedCodes.findIndex((candidate) => editorCode === candidate) : -1;
    const inviteValidation = inviteCode
      ? await validateAndConsumeEditorInvite({ applicant_email: email, invite_code: inviteCode })
      : { matched: false as const };

    if (matchedCodeIndex < 0 && !inviteValidation.matched) {
      await recordSecurityEvent({
        kind: 'alert',
        actorEmail: email,
        route: '/api/auth/editor-login',
        detail: 'editor_login_invalid_code_or_invite'
      });
      await maybeRecordEditorLoginFailureAlert(email);
      return NextResponse.json({ error: 'Invalid editor access code or invite code' }, { status: 401 });
    }

    let editorRole: SessionEditorRole = 'review_editor';
    if (matchedCodeIndex >= 0) {
      if (!canUseManagingEditorCode(email)) {
        return NextResponse.json({ error: 'This editor access code is reserved for managing editors.' }, { status: 403 });
      }
      editorRole = requestedEditorRole ?? 'managing_editor';
    }

    const sessionUser = {
      id: randomUUID(),
      email,
      name,
      role: 'editor' as const,
      editor_role: editorRole
    };

    setSessionCookie(await issueSessionToken(sessionUser));
    await recordSecurityEvent({
      kind: 'alert',
      actorEmail: email,
      route: '/api/auth/editor-login',
      detail: matchedCodeIndex >= 0 ? `editor_login_success:slot_${matchedCodeIndex}` : 'editor_login_success:invite_code'
    });

    return NextResponse.json({
      data: sessionUser,
      mode: matchedCodeIndex >= 0 ? (process.env.EDITOR_ACCESS_CODE ? 'env' : 'demo-default') : 'invite',
      credential_slot: matchedCodeIndex
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
