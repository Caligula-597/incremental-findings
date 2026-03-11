import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listSecurityEvents } from '@/lib/security-service';

export async function GET(request: Request) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get('limit') ?? '50');
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

    const data = await listSecurityEvents(limit);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
