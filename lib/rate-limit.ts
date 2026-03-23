interface RateLimitRecord {
  count: number;
  windowStartMs: number;
}

interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitOptions {
  bucket: string;
  maxRequests: number;
  windowMs: number;
}

const store = new Map<string, RateLimitRecord>();
const IP_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$/;

function nowMs() {
  return Date.now();
}

function cleanupExpired(current: number) {
  for (const [key, value] of store) {
    if (current - value.windowStartMs > 10 * 60 * 1000) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: Request) {
  const trustProxyHeaders = process.env.TRUST_PROXY_IP_HEADERS === 'true';
  if (!trustProxyHeaders) {
    return 'unknown';
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  const candidate = forwarded || real || '';
  if (candidate && IP_PATTERN.test(candidate)) {
    return candidate;
  }

  return 'unknown';
}

export function checkRateLimit(options: RateLimitOptions): RateLimitDecision {
  const { bucket, maxRequests, windowMs } = options;
  const current = nowMs();
  cleanupExpired(current);

  const existing = store.get(bucket);

  if (!existing || current - existing.windowStartMs >= windowMs) {
    store.set(bucket, { count: 1, windowStartMs: current });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: 0
    };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;

  const allowed = nextCount <= maxRequests;
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((windowMs - (current - existing.windowStartMs)) / 1000));

  return {
    allowed,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - nextCount),
    retryAfterSeconds
  };
}
