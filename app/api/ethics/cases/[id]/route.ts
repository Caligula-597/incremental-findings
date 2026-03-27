import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeEthicsCases } from '@/lib/runtime-store';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const sessionUser = await getServerSessionUser();
  if (!sessionUser || sessionUser.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status ? String(body.status) : undefined;
  const resolutionNote = body.resolution_note ? String(body.resolution_note) : undefined;
  const ownerEmail = body.owner_email ? String(body.owner_email).toLowerCase() : undefined;
  const updates = {
    ...(status ? { status } : {}),
    ...(resolutionNote !== undefined ? { resolution_note: resolutionNote } : {}),
    ...(ownerEmail ? { owner_email: ownerEmail } : {}),
    updated_at: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const updated = await supabase.from('ethics_cases').update(updates).eq('id', context.params.id).select('*').maybeSingle();
    if (!updated.error) {
      return NextResponse.json({ data: updated.data ?? null, mode: 'supabase' });
    }
  }

  const target = runtimeEthicsCases.find((item) => item.id === context.params.id);
  if (!target) {
    return NextResponse.json({ error: 'Ethics case not found' }, { status: 404 });
  }

  Object.assign(target, updates);
  return NextResponse.json({ data: target, mode: 'memory' });
}
