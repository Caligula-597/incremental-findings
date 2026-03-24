import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { canExposeDebugVerificationCode, canResendVerification, createOrRefreshEmailVerification, getEmailVerification, getResendCooldownSeconds } from '@/lib/email-verification';
import { guardRequest } from '@/lib/request-guard';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const resendGuard = await guardRequest(request, {
      route: '/api/auth/resend-verification',
      bucketPrefix: 'auth-resend-verification',
      bucketKeySuffix: email,
      maxRequests: Number(process.env.AUTH_RESEND_VERIFICATION_RATE_LIMIT_MAX ?? '10') || 10,
      windowMs: Number(process.env.AUTH_RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many resend requests. Please try again later.'
    });
    if (resendGuard.response) {
      return resendGuard.response;
    }

    const supabase = getSupabaseServerClient();
    let accountExists = false;

    if (supabase) {
      const accountResult = await supabase.from('user_accounts').select('id').eq('email', email).maybeSingle();
      accountExists = !accountResult.error && Boolean(accountResult.data?.id);
    } else {
      accountExists = runtimeUsers.some((item) => item.email === email);
    }

    if (!accountExists) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const verification = await getEmailVerification(email);
    if (verification.record?.verified_at) {
      return NextResponse.json({ error: 'Email already verified.' }, { status: 409 });
    }

    if (!canResendVerification(verification.record)) {
      return NextResponse.json(
        { error: `Please wait ${getResendCooldownSeconds()} seconds before requesting another code.` },
        { status: 429 }
      );
    }

    const refreshed = await createOrRefreshEmailVerification({ email, userId: verification.record?.user_id ?? null });
    const debugVerificationCode = canExposeDebugVerificationCode() ? refreshed.code : undefined;
    return NextResponse.json({ ok: true, ...(debugVerificationCode ? { debug_verification_code: debugVerificationCode } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
