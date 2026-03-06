import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeOrcidLinks } from '@/lib/runtime-store';

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase.from('orcid_links').select('*').eq('user_email', email).maybeSingle();
    if (!result.error) {
      return NextResponse.json({ data: result.data ?? null, mode: 'supabase' });
    }
  }

  const record = runtimeOrcidLinks.find((item) => item.user_email === email) ?? null;
  return NextResponse.json({ data: record, mode: 'memory' });
}
