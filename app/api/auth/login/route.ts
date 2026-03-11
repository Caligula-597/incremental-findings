import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { hashPassword, needsPasswordRehash, verifyPassword } from '@/lib/auth-security';
import { buildSessionToken, setSessionCookie } from '@/lib/session';
import { guardRequest } from '@/lib/request-guard';

function normalizeIdentifier(body: any) {
  const fromIdentifier = String(body.identifier ?? '').trim().toLowerCase();
  const fromEmail = String(body.email ?? '').trim().toLowerCase();
  const fromUsername = String(body.username ?? '').trim().toLowerCase();
  const identifier = fromIdentifier || fromEmail || fromUsername;
  return identifier;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = normalizeIdentifier(body);
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'identifier(email or username) and password are required' }, { status: 400 });
    }


    const loginGuard = await guardRequest(request, {
      route: '/api/auth/login',
      bucketPrefix: 'auth-login',
      bucketKeySuffix: identifier || 'unknown',
      maxRequests: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? '20') || 20,
      windowMs: Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many login attempts. Please try again later.'
    });
    if (loginGuard.response) {
      return loginGuard.response;
    }

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const byEmail = await supabase
        .from('user_accounts')
        .select('id,email,username,name,password_hash')
        .eq('email', identifier)
        .maybeSingle();

      const byUsername = await supabase
        .from('user_accounts')
        .select('id,email,username,name,password_hash')
        .eq('username', identifier)
        .maybeSingle();

      const account = (!byEmail.error && byEmail.data ? byEmail.data : null) ?? (!byUsername.error && byUsername.data ? byUsername.data : null);

      if (account && verifyPassword(password, account.password_hash)) {
        if (needsPasswordRehash(account.password_hash)) {
          await supabase.from('user_accounts').update({ password_hash: hashPassword(password) }).eq('id', account.id);
        }

        const sessionUser = {
          id: account.id,
          email: account.email,
          name: account.name ?? account.username ?? account.email,
          role: 'author' as const
        };

        setSessionCookie(buildSessionToken(sessionUser));
        return NextResponse.json({
          data: { ...sessionUser, username: account.username ?? null },
          mode: 'supabase'
        });
      }

      if (byEmail.error && byUsername.error) {
        return NextResponse.json(
          { error: `Failed to query account from Supabase: ${byEmail.error.message}; ${byUsername.error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: 'Invalid email/username or password' }, { status: 401 });
    }

    const user = runtimeUsers.find(
      (item) =>
        (item.email === identifier || (item.username ? item.username.toLowerCase() === identifier : false)) &&
        verifyPassword(password, item.password_hash)
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid email/username or password' }, { status: 401 });
    }

    if (needsPasswordRehash(user.password_hash)) {
      user.password_hash = hashPassword(password);
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'author' as const
    };

    setSessionCookie(buildSessionToken(sessionUser));
    return NextResponse.json({
      data: { ...sessionUser, username: user.username ?? null },
      mode: 'memory'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
