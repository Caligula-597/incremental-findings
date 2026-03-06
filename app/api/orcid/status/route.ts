import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeOrcidLinks } from '@/lib/runtime-store';

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase();
  const userId = (request.nextUrl.searchParams.get('user_id') ?? '').trim();

  if (!email && !userId) {
    return NextResponse.json({ error: 'email or user_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    if (email) {
      const result = await supabase.from('orcid_links').select('*').eq('user_email', email).maybeSingle();
      if (!result.error) {
        return NextResponse.json({ data: result.data ?? null, mode: 'supabase' });
      }
    }

    if (userId) {
      const resultV2 = await supabase.from('orcid_links').select('*').eq('user_id', userId).maybeSingle();
      if (!resultV2.error) {
        return NextResponse.json({ data: resultV2.data ?? null, mode: 'supabase-v2' });
      }
    }
  }

  const record = runtimeOrcidLinks.find((item) => item.user_email === email || item.user_id === userId) ?? null;
  return NextResponse.json({ data: record, mode: 'memory' });
}
