import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { runRiskCheck } from '@/lib/security-service';
import { guardRequest } from '@/lib/request-guard';

export async function POST(request: Request) {
  try {
    const sessionUser = getServerSessionUser();
    const body = await request.json().catch(() => ({}));

    const route = String(body?.route ?? request.headers.get('x-pathname') ?? 'unknown').trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const riskGuard = await guardRequest(request, {
      route: '/api/security/risk-check',
      bucketPrefix: 'security-risk-check',
      maxRequests: Number(process.env.SECURITY_RISK_CHECK_RATE_LIMIT_MAX ?? '30') || 30,
      windowMs: Number(process.env.SECURITY_RISK_CHECK_RATE_LIMIT_WINDOW_MS ?? '60000') || 60000,
      limitError: 'Too many risk-check requests. Please try again later.'
    });
    if (riskGuard.response) {
      return riskGuard.response;
    }

    const data = await runRiskCheck({
      ip: riskGuard.ip,
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
