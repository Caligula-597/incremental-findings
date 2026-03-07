import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { hashPassword } from '@/lib/auth-security';
import { buildSessionToken, setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const name = String(body.name ?? '').trim();
    const accountKey = email || username;

    if (!accountKey || !password) {
      return NextResponse.json({ error: 'email(or username) and password are required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const existingByEmail = await supabase.from('user_accounts').select('id').eq('email', accountKey).maybeSingle();
      if (!existingByEmail.error && existingByEmail.data) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }

      const existingByUsername = await supabase.from('user_accounts').select('id').eq('username', accountKey).maybeSingle();
      if (!existingByUsername.error && existingByUsername.data) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }

      const insert = await supabase
        .from('user_accounts')
        .insert({ email: accountKey, name: name || accountKey, username: accountKey, password_hash: passwordHash, created_at: now })
        .select('id,email,name,created_at')
        .single();

      if (!insert.error) {
        const sessionUser = {
          id: insert.data.id,
          email: insert.data.email ?? accountKey,
          name: insert.data.name ?? name ?? accountKey,
          role: 'author' as const
        };

        setSessionCookie(buildSessionToken(sessionUser));
        return NextResponse.json(
          {
            data: {
              ...sessionUser,
              created_at: insert.data.created_at
            },
            mode: 'supabase'
          },
          { status: 201 }
        );
      }

      const insertV2 = await supabase
        .from('user_accounts')
        .insert({ username: accountKey, password_hash: passwordHash, created_at: now })
        .select('id,username,created_at')
        .single();

      if (!insertV2.error) {
        const sessionUser = {
          id: insertV2.data.id,
          email: insertV2.data.username,
          name: name || insertV2.data.username,
          role: 'author' as const
        };

        setSessionCookie(buildSessionToken(sessionUser));
        return NextResponse.json(
          {
            data: {
              ...sessionUser,
              created_at: insertV2.data.created_at
            },
            mode: 'supabase-v2'
          },
          { status: 201 }
        );
      }

      return NextResponse.json({ error: `Failed to create account in Supabase: ${insertV2.error.message}` }, { status: 500 });
    }

    const exists = runtimeUsers.find((item) => item.email === accountKey);
    if (exists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const created = { id: randomUUID(), email: accountKey, name: name || accountKey, password_hash: passwordHash, created_at: now };
    runtimeUsers.push(created);

    const sessionUser = {
      id: created.id,
      email: created.email,
      name: created.name,
      role: 'author' as const
    };

    setSessionCookie(buildSessionToken(sessionUser));
    return NextResponse.json({ data: sessionUser, mode: 'memory' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
