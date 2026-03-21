import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';
import { hashPassword } from '@/lib/auth-security';
import { guardRequest } from '@/lib/request-guard';
import { createOrRefreshEmailVerification } from '@/lib/email-verification';

function normalizeUsername(input: string) {
  const value = input.trim().toLowerCase();
  return value.length > 0 ? value : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const username = normalizeUsername(String(body.username ?? ''));
    const password = String(body.password ?? '');
    const name = String(body.name ?? '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    const registerGuard = await guardRequest(request, {
      route: '/api/auth/register',
      bucketPrefix: 'auth-register',
      maxRequests: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX ?? '10') || 10,
      windowMs: Number(process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many registration attempts. Please try again later.'
    });
    if (registerGuard.response) {
      return registerGuard.response;
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const existingByEmail = await supabase.from('user_accounts').select('id').eq('email', email).maybeSingle();
      if (!existingByEmail.error && existingByEmail.data) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      if (username) {
        const existingByUsername = await supabase.from('user_accounts').select('id').eq('username', username).maybeSingle();
        if (!existingByUsername.error && existingByUsername.data) {
          return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }
      }

      const insert = await supabase
        .from('user_accounts')
        .insert({
          email,
          username,
          name: name || username || email,
          password_hash: passwordHash,
          created_at: now
        })
        .select('id,email,username,name,created_at')
        .single();

      if (insert.error) {
        return NextResponse.json({ error: `Failed to create account in Supabase: ${insert.error.message}` }, { status: 500 });
      }

      const verification = await createOrRefreshEmailVerification({ email, userId: insert.data.id });
      const debugVerificationCode = !process.env.RESEND_API_KEY ? verification.code : undefined;

      return NextResponse.json(
        {
          data: {
            id: insert.data.id,
            email: insert.data.email ?? email,
            name: insert.data.name ?? name ?? username ?? email,
            username: insert.data.username ?? username,
            created_at: insert.data.created_at,
            role: 'author'
          },
          mode: 'supabase',
          requires_verification: true,
          ...(debugVerificationCode ? { debug_verification_code: debugVerificationCode } : {})
        },
        { status: 201 }
      );
    }

    const existsByEmail = runtimeUsers.find((item) => item.email === email);
    if (existsByEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    if (username) {
      const existsByUsername = runtimeUsers.find((item) => item.username && item.username.toLowerCase() === username);
      if (existsByUsername) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
    }

    const created = {
      id: randomUUID(),
      email,
      username,
      name: name || username || email,
      password_hash: passwordHash,
      created_at: now
    };
    runtimeUsers.push(created);
    const verification = await createOrRefreshEmailVerification({ email, userId: created.id });
    const debugVerificationCode = !process.env.RESEND_API_KEY ? verification.code : undefined;

    return NextResponse.json(
      {
        data: { id: created.id, email: created.email, name: created.name, username: created.username, role: 'author' },
        mode: 'memory',
        requires_verification: true,
        ...(debugVerificationCode ? { debug_verification_code: debugVerificationCode } : {})
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
