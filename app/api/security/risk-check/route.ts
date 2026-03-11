import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { runRiskCheck } from '@/lib/security-service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const sessionUser = getServerSessionUser();
    const body = await request.json().catch(() => ({}));

    const route = String(body?.route ?? request.headers.get('x-pathname') ?? 'unknown').trim() || 'unknown';
    const ip = String(body?.ip ?? getClientIp(request)).trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') ?? undefined;


    const limit = checkRateLimit({
      bucket: `security-risk-check:${ip}`,
      maxRequests: Number(process.env.SECURITY_RISK_CHECK_RATE_LIMIT_MAX ?? '30') || 30,
      windowMs: Number(process.env.SECURITY_RISK_CHECK_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many risk-check requests. Please try again later.', retry_after_seconds: limit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

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
