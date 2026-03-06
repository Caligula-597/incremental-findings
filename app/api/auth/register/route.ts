import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeUsers } from '@/lib/runtime-store';

function hashPassword(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const name = String(body.name ?? '').trim();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const existing = await supabase.from('user_accounts').select('id').eq('email', email).maybeSingle();
      if (existing.error) {
        return NextResponse.json(
          {
            error: `Failed to check existing account in Supabase: ${existing.error.message}`
          },
          { status: 500 }
        );
      }

      if (existing.data) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }

      const insert = await supabase
        .from('user_accounts')
        .insert({ email, name, password_hash: passwordHash, created_at: now })
        .select('id,email,name,created_at,password_hash')
        .single();

      if (!insert.error) {
        return NextResponse.json(
          {
            data: { id: insert.data.id, email: insert.data.email, name: insert.data.name, created_at: insert.data.created_at },
            mode: 'supabase'
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to create account in Supabase: ${insert.error.message}`
        },
        { status: 500 }
      );
    }

    const exists = runtimeUsers.find((item) => item.email === email);
    if (exists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const created = { id: randomUUID(), email, name, password_hash: passwordHash, created_at: now };
    runtimeUsers.push(created);
    return NextResponse.json({ data: { id: created.id, email: created.email, name: created.name }, mode: 'memory' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
