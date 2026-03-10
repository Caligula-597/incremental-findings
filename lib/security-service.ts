import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeIpRateLimits, runtimeRiskScores, runtimeSecurityEvents } from '@/lib/runtime-store';
import { IpRateLimitRecord, RiskScoreRecord, SecurityEventRecord } from '@/lib/types';

type RiskCheckInput = {
  ip: string;
  route: string;
  actorEmail?: string;
  userAgent?: string;
};

function computeRiskScore(input: RiskCheckInput) {
  const reasons: string[] = [];
  let score = 5;

  if (!input.ip || input.ip === 'unknown') {
    score += 25;
    reasons.push('missing-ip');
  }

  if (input.route.includes('/api/auth/login') || input.route.includes('/api/auth/register')) {
    score += 20;
    reasons.push('auth-sensitive-route');
  }

  if (input.userAgent?.toLowerCase().includes('curl')) {
    score += 15;
    reasons.push('non-browser-client');
  }

  const recentBlocks = runtimeIpRateLimits.filter((item) => item.ip === input.ip).length;
  if (recentBlocks > 0) {
    score += Math.min(40, recentBlocks * 10);
    reasons.push('historical-blocked-ip');
  }

  let decision: RiskScoreRecord['decision'] = 'allow';
  if (score >= 60) decision = 'block';
  else if (score >= 35) decision = 'challenge';

  return {
    score: Math.min(score, 100),
    decision,
    reasons
  };
}

async function persistSecurityEvent(event: SecurityEventRecord) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('security_events').insert(event);
    if (!inserted.error) return;
  }

  runtimeSecurityEvents.unshift(event);
}

export async function runRiskCheck(input: RiskCheckInput): Promise<RiskScoreRecord> {
  const result = computeRiskScore(input);
  const record: RiskScoreRecord = {
    id: randomUUID(),
    ip: input.ip,
    route: input.route,
    score: result.score,
    decision: result.decision,
    reasons: result.reasons,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('risk_scores').insert({ ...record, reasons: JSON.stringify(record.reasons) });
    if (inserted.error) {
      runtimeRiskScores.unshift(record);
    }
  } else {
    runtimeRiskScores.unshift(record);
  }

  await persistSecurityEvent({
    id: randomUUID(),
    kind: 'risk_check',
    actor_email: input.actorEmail ?? null,
    ip: input.ip,
    route: input.route,
    detail: `risk_check:${record.decision}`,
    risk_score: record.score,
    created_at: record.created_at
  });

  return record;
}

export async function listSecurityEvents(limit = 50): Promise<SecurityEventRecord[]> {
  const bounded = Math.max(1, Math.min(200, limit));
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const rows = await supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(bounded);
    if (!rows.error) {
      return (rows.data ?? []) as SecurityEventRecord[];
    }
  }

  return runtimeSecurityEvents.slice(0, bounded);
}

export async function blockIp(input: {
  ip: string;
  route: string;
  reason: string;
  actorEmail: string;
  ttlMinutes?: number;
}): Promise<IpRateLimitRecord> {
  const now = new Date();
  const ttlMinutes = Math.max(1, Math.min(24 * 60, input.ttlMinutes ?? 60));
  const blockedUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

  const record: IpRateLimitRecord = {
    id: randomUUID(),
    ip: input.ip,
    route: input.route,
    blocked_until: blockedUntil,
    reason: input.reason,
    created_at: now.toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('ip_rate_limits').insert(record);
    if (inserted.error) {
      runtimeIpRateLimits.unshift(record);
    }
  } else {
    runtimeIpRateLimits.unshift(record);
  }

  await persistSecurityEvent({
    id: randomUUID(),
    kind: 'blocked',
    actor_email: input.actorEmail,
    ip: input.ip,
    route: input.route,
    detail: `block_ip:${input.reason}`,
    risk_score: null,
    created_at: now.toISOString()
  });

  return record;
}
