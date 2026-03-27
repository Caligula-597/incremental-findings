import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeEthicsCases } from '@/lib/runtime-store';

export async function GET() {
  const sessionUser = await getServerSessionUser();
  if (!sessionUser || sessionUser.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase.from('ethics_cases').select('*').order('created_at', { ascending: false });
    if (!result.error) {
      return NextResponse.json({ data: result.data ?? [], mode: 'supabase' });
    }
  }

  return NextResponse.json({ data: [...runtimeEthicsCases].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), mode: 'memory' });
}

export async function POST(request: Request) {
  const sessionUser = await getServerSessionUser();
  if (!sessionUser || sessionUser.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const submissionId = String(body.submission_id ?? '').trim();
  const caseType = String(body.case_type ?? '').trim();
  const summary = String(body.summary ?? '').trim();

  if (!submissionId || !caseType || !summary) {
    return NextResponse.json({ error: 'submission_id, case_type, summary are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    submission_id: submissionId,
    case_type: caseType,
    status: 'open',
    summary,
    reporter_email: sessionUser.email,
    owner_email: sessionUser.email,
    resolution_note: null,
    created_at: now,
    updated_at: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const insert = await supabase.from('ethics_cases').insert(record).select('*').maybeSingle();
    if (!insert.error) {
      return NextResponse.json({ data: insert.data ?? record, mode: 'supabase' }, { status: 201 });
    }
  }

  runtimeEthicsCases.push(record as any);
  return NextResponse.json({ data: record, mode: 'memory' }, { status: 201 });
}
