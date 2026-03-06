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
      const insert = await supabase
        .from('user_accounts')
        .insert({ email, name, password_hash: passwordHash, created_at: now })
        .select('id,email,name,created_at')
        .single();

      if (!insert.error) {
        return NextResponse.json({ data: insert.data, mode: 'supabase' }, { status: 201 });
      }
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
