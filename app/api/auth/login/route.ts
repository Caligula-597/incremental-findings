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

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const result = await supabase
        .from('user_accounts')
        .select('id,email,name,password_hash')
        .eq('email', email)
        .maybeSingle();

      if (!result.error && result.data && result.data.password_hash === passwordHash) {
        return NextResponse.json({
          data: { id: result.data.id, email: result.data.email, name: result.data.name, session_token: randomUUID() },
          mode: 'supabase'
        });
      }
    }

    const user = runtimeUsers.find((item) => item.email === email && item.password_hash === passwordHash);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name, session_token: randomUUID() },
      mode: 'memory'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
