import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { canExposeDebugVerificationCode, createOrRefreshEmailVerification } from '@/lib/email-verification';
import { guardRequest } from '@/lib/request-guard';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const codeGuard = await guardRequest(request, {
      route: '/api/auth/register/request-code',
      bucketPrefix: 'auth-register-code',
      bucketKeySuffix: email,
      maxRequests: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX ?? '10') || 10,
      windowMs: Number(process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many verification code requests. Please try again later.'
    });
    if (codeGuard.response) {
      return codeGuard.response;
    }

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const existing = await supabase.from('user_accounts').select('id').eq('email', email).maybeSingle();
      if (!existing.error && existing.data?.id) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
    } else if (runtimeUsers.some((item) => item.email === email)) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const verification = await createOrRefreshEmailVerification({ email, userId: null });
    const debugVerificationCode = canExposeDebugVerificationCode() ? verification.code : undefined;

    return NextResponse.json({ ok: true, ...(debugVerificationCode ? { debug_verification_code: debugVerificationCode } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
