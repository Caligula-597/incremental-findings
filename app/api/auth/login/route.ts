import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { hashPassword, needsPasswordRehash, verifyPassword } from '@/lib/auth-security';
import { buildSessionToken, setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const username = String(body.username ?? '').trim().toLowerCase();
    const accountKey = email || username;
    const password = String(body.password ?? '');

    if (!accountKey || !password) {
      return NextResponse.json({ error: 'email(or username) and password are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const result = await supabase.from('user_accounts').select('id,email,name,password_hash').eq('email', accountKey).maybeSingle();

      if (!result.error && result.data && verifyPassword(password, result.data.password_hash)) {
        if (needsPasswordRehash(result.data.password_hash)) {
          await supabase.from('user_accounts').update({ password_hash: hashPassword(password) }).eq('id', result.data.id);
        }

        const sessionUser = {
          id: result.data.id,
          email: result.data.email ?? accountKey,
          name: result.data.name ?? result.data.email ?? accountKey,
          role: 'author' as const
        };

        setSessionCookie(buildSessionToken(sessionUser));
        return NextResponse.json({
          data: { ...sessionUser, session_token: randomUUID() },
          mode: 'supabase'
        });
      }

      const resultV2 = await supabase.from('user_accounts').select('id,username,password_hash').eq('username', accountKey).maybeSingle();
      if (!resultV2.error && resultV2.data && verifyPassword(password, resultV2.data.password_hash)) {
        if (needsPasswordRehash(resultV2.data.password_hash)) {
          await supabase.from('user_accounts').update({ password_hash: hashPassword(password) }).eq('id', resultV2.data.id);
        }

        const sessionUser = {
          id: resultV2.data.id,
          email: resultV2.data.username,
          name: resultV2.data.username,
          role: 'author' as const
        };

        setSessionCookie(buildSessionToken(sessionUser));
        return NextResponse.json({
          data: { ...sessionUser, session_token: randomUUID() },
          mode: 'supabase-v2'
        });
      }

      if (result.error && resultV2.error) {
        return NextResponse.json(
          { error: `Failed to query account from Supabase: ${result.error.message}; ${resultV2.error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = runtimeUsers.find((item) => item.email === accountKey && verifyPassword(password, item.password_hash));
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
      data: { ...sessionUser, session_token: randomUUID() },
      mode: 'memory'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
