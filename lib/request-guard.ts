import { NextResponse } from 'next/server';
import { checkRateLimitDistributed, getClientIp } from '@/lib/rate-limit';
import { enforceNotBlocked } from '@/lib/security-service';

interface RequestGuardOptions {
  route: string;
  bucketPrefix: string;
  maxRequests: number;
  windowMs: number;
  limitError: string;
  bucketKeySuffix?: string;
}

export async function guardRequest(request: Request, options: RequestGuardOptions) {
  const ip = getClientIp(request);
  const blocked = await enforceNotBlocked({ ip, route: options.route });
  if (blocked) {
    return {
      ip,
      response: NextResponse.json(blocked.body, { status: blocked.status })
    };
  }

  const suffix = options.bucketKeySuffix?.trim();
  const bucket = suffix ? `${options.bucketPrefix}:${ip}:${suffix}` : `${options.bucketPrefix}:${ip}`;
  const limit = await checkRateLimitDistributed({
    bucket,
    maxRequests: options.maxRequests,
    windowMs: options.windowMs
  });

  if (!limit.allowed) {
    return {
      ip,
      response: NextResponse.json(
        { error: options.limitError, retry_after_seconds: limit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    };
  }

  return { ip, response: null };
}
