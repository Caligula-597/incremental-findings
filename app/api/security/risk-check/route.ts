import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { runRiskCheck } from '@/lib/security-service';

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: Request) {
  try {
    const sessionUser = getServerSessionUser();
    const body = await request.json().catch(() => ({}));

    const route = String(body?.route ?? request.headers.get('x-pathname') ?? 'unknown').trim() || 'unknown';
    const ip = String(body?.ip ?? getClientIp(request)).trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const data = await runRiskCheck({
      ip,
      route,
      actorEmail: sessionUser?.email,
      userAgent
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
