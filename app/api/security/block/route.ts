import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { blockIp } from '@/lib/security-service';

export async function POST(request: Request) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const ip = String(body?.ip ?? '').trim();
    const route = String(body?.route ?? 'global').trim() || 'global';
    const reason = String(body?.reason ?? '').trim();
    const ttlMinutes = Number(body?.ttl_minutes ?? 60);

    if (!ip) {
      return NextResponse.json({ error: 'ip is required' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    const data = await blockIp({
      ip,
      route,
      reason,
      actorEmail: sessionUser.email,
      ttlMinutes: Number.isFinite(ttlMinutes) ? ttlMinutes : 60
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
