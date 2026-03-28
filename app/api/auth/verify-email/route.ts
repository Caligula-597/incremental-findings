import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { issueSessionToken, setSessionCookie } from '@/lib/session';
import { verifyEmailCode } from '@/lib/email-verification';
import { guardRequest } from '@/lib/request-guard';

function buildSessionUser(account: { id: string; email: string; name: string }) {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: 'author' as const
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const code = String(body.code ?? '').trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'email and code are required' }, { status: 400 });
    }

    const verifyGuard = await guardRequest(request, {
      route: '/api/auth/verify-email',
      bucketPrefix: 'auth-verify-email',
      bucketKeySuffix: email,
      maxRequests: Number(process.env.AUTH_VERIFY_EMAIL_RATE_LIMIT_MAX ?? '20') || 20,
      windowMs: Number(process.env.AUTH_VERIFY_EMAIL_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many email verification attempts. Please try again later.'
    });
    if (verifyGuard.response) {
      return verifyGuard.response;
    }

    const verification = await verifyEmailCode({ email, code });
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const accountResult = await supabase.from('user_accounts').select('id,email,name').eq('email', email).maybeSingle();
      if (!accountResult.error && accountResult.data) {
        const sessionUser = buildSessionUser({
          id: String(accountResult.data.id),
          email: String(accountResult.data.email),
          name: String(accountResult.data.name ?? accountResult.data.email)
        });
        setSessionCookie(await issueSessionToken(sessionUser));
        return NextResponse.json({ data: sessionUser, mode: 'supabase', already_verified: verification.alreadyVerified });
      }
    }

    const account = runtimeUsers.find((item) => item.email === email);
    if (!account) {
      return NextResponse.json({ error: 'Account not found for verification.' }, { status: 404 });
    }

    const sessionUser = buildSessionUser(account);
    setSessionCookie(await issueSessionToken(sessionUser));
    return NextResponse.json({ data: sessionUser, mode: 'memory', already_verified: verification.alreadyVerified });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
