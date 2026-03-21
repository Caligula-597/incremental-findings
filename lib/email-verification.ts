import { createHash, randomInt } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeEmailVerifications } from '@/lib/runtime-store';
import { EmailVerificationRecord } from '@/lib/types';

const CODE_TTL_MINUTES = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? '15') || 15;
const RESEND_COOLDOWN_SECONDS = Number(process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS ?? '60') || 60;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Incremental Findings <no-reply@incremental-findings.local>';

type VerificationLookup = {
  record: EmailVerificationRecord | null;
  mode: 'supabase' | 'memory';
};

function hashCode(code: string) {
  return createHash('sha256').update(`${code}:${process.env.SESSION_SECRET ?? 'dev-verification-secret'}`).digest('hex');
}

export function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function getVerificationEmailPreview(code: string) {
  return {
    subject: '[Incremental Findings] Verify your email address',
    html: `<p>Welcome to Incremental Findings.</p><p>Your email verification code is <strong>${code}</strong>.</p><p>The code expires in ${CODE_TTL_MINUTES} minutes.</p>`,
    text: `Welcome to Incremental Findings. Your email verification code is ${code}. The code expires in ${CODE_TTL_MINUTES} minutes.`
  };
}

async function sendVerificationEmail(email: string, code: string) {
  const preview = getVerificationEmailPreview(code);
  if (!process.env.RESEND_API_KEY) {
    console.info('[email-verification:log-only]', { email, code, subject: preview.subject });
    return { provider: 'log-only' as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: preview.subject,
      html: preview.html,
      text: preview.text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send verification email: ${body || response.statusText}`);
  }

  return { provider: 'resend' as const };
}

function mapVerificationRecord(data: Record<string, unknown>): EmailVerificationRecord {
  return {
    email: String(data.email ?? ''),
    user_id: data.user_id ? String(data.user_id) : null,
    code_hash: String(data.code_hash ?? ''),
    expires_at: String(data.expires_at ?? ''),
    sent_at: String(data.sent_at ?? ''),
    verified_at: data.verified_at ? String(data.verified_at) : null,
    attempt_count: Number(data.attempt_count ?? 0),
    created_at: String(data.created_at ?? ''),
    updated_at: String(data.updated_at ?? '')
  };
}

export async function getEmailVerification(email: string): Promise<VerificationLookup> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const result = await supabase
      .from('email_verifications')
      .select('email,user_id,code_hash,expires_at,sent_at,verified_at,attempt_count,created_at,updated_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!result.error) {
      return {
        record: result.data ? mapVerificationRecord(result.data as Record<string, unknown>) : null,
        mode: 'supabase'
      };
    }
  }

  return {
    record: runtimeEmailVerifications.find((item) => item.email === normalizedEmail) ?? null,
    mode: 'memory'
  };
}

export async function createOrRefreshEmailVerification(input: { email: string; userId?: string | null }) {
  const email = input.email.trim().toLowerCase();
  const code = generateVerificationCode();
  const now = new Date();
  const payload: EmailVerificationRecord = {
    email,
    user_id: input.userId ?? null,
    code_hash: hashCode(code),
    expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString(),
    sent_at: now.toISOString(),
    verified_at: null,
    attempt_count: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const existing = await supabase.from('email_verifications').select('created_at').eq('email', email).maybeSingle();
    const upsert = await supabase.from('email_verifications').upsert(
      {
        email,
        user_id: input.userId ?? null,
        code_hash: payload.code_hash,
        expires_at: payload.expires_at,
        sent_at: payload.sent_at,
        verified_at: null,
        attempt_count: 0,
        created_at: !existing.error && existing.data?.created_at ? existing.data.created_at : payload.created_at,
        updated_at: payload.updated_at
      },
      { onConflict: 'email' }
    );

    if (!upsert.error) {
      await sendVerificationEmail(email, code);
      return { mode: 'supabase' as const, code };
    }
  }

  const current = runtimeEmailVerifications.find((item) => item.email === email);
  if (current) {
    current.user_id = input.userId ?? current.user_id ?? null;
    current.code_hash = payload.code_hash;
    current.expires_at = payload.expires_at;
    current.sent_at = payload.sent_at;
    current.verified_at = null;
    current.attempt_count = 0;
    current.updated_at = payload.updated_at;
  } else {
    runtimeEmailVerifications.unshift(payload);
  }

  await sendVerificationEmail(email, code);
  return { mode: 'memory' as const, code };
}

async function incrementVerificationAttempts(email: string, mode: 'supabase' | 'memory', nextCount: number) {
  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (mode === 'supabase' && supabase) {
    await supabase.from('email_verifications').update({ attempt_count: nextCount, updated_at: now }).eq('email', email);
    return;
  }

  const current = runtimeEmailVerifications.find((item) => item.email === email);
  if (current) {
    current.attempt_count = nextCount;
    current.updated_at = now;
  }
}

export async function verifyEmailCode(input: { email: string; code: string }) {
  const email = input.email.trim().toLowerCase();
  const code = String(input.code ?? '').trim();
  const lookup = await getEmailVerification(email);
  const record = lookup.record;
  if (!record) {
    return { ok: false as const, status: 404, error: 'Verification code not found. Please resend the verification email.' };
  }

  if (record.verified_at) {
    return { ok: true as const, alreadyVerified: true as const, mode: lookup.mode };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false as const, status: 410, error: 'Verification code expired. Please resend the verification email.' };
  }

  if (hashCode(code) !== record.code_hash) {
    await incrementVerificationAttempts(email, lookup.mode, record.attempt_count + 1);
    return { ok: false as const, status: 400, error: 'Invalid verification code.' };
  }

  const verifiedAt = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (lookup.mode === 'supabase' && supabase) {
    const update = await supabase
      .from('email_verifications')
      .update({ verified_at: verifiedAt, updated_at: verifiedAt })
      .eq('email', email);
    if (update.error) {
      return { ok: false as const, status: 500, error: `Failed to verify email: ${update.error.message}` };
    }
  } else {
    record.verified_at = verifiedAt;
    record.updated_at = verifiedAt;
  }

  return { ok: true as const, alreadyVerified: false as const, mode: lookup.mode, verifiedAt };
}

export function canResendVerification(record: EmailVerificationRecord | null) {
  if (!record) return true;
  return Date.now() - new Date(record.sent_at).getTime() >= RESEND_COOLDOWN_SECONDS * 1000;
}

export function getResendCooldownSeconds() {
  return RESEND_COOLDOWN_SECONDS;
}
