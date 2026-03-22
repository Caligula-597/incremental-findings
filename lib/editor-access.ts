import { randomBytes, randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeEditorApplications, runtimeEditorInvites } from '@/lib/runtime-store';
import { EditorApplicationRecord, EditorInviteRecord } from '@/lib/types';

function generateInviteCode() {
  return randomBytes(12).toString('hex');
}

export async function submitEditorApplication(input: {
  applicant_email: string;
  applicant_name: string;
  statement: string;
}) {
  const now = new Date().toISOString();
  const record: EditorApplicationRecord = {
    id: randomUUID(),
    applicant_email: input.applicant_email,
    applicant_name: input.applicant_name,
    statement: input.statement,
    status: 'pending',
    created_at: now,
    updated_at: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const existing = await supabase
      .from('editor_applications')
      .select('*')
      .eq('applicant_email', input.applicant_email)
      .in('status', ['pending', 'under_review'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing.error && existing.data) {
      return { data: existing.data as EditorApplicationRecord, mode: 'supabase', reused: true };
    }

    const inserted = await supabase.from('editor_applications').insert(record).select('*').maybeSingle();
    if (!inserted.error) {
      return { data: (inserted.data ?? record) as EditorApplicationRecord, mode: 'supabase', reused: false };
    }
  }

  const existingRuntime = runtimeEditorApplications.find(
    (item) => item.applicant_email === input.applicant_email && (item.status === 'pending' || item.status === 'under_review')
  );
  if (existingRuntime) {
    return { data: existingRuntime, mode: 'memory', reused: true };
  }

  runtimeEditorApplications.unshift(record);
  return { data: record, mode: 'memory', reused: false };
}

export async function listEditorApplications(status?: EditorApplicationRecord['status']) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('editor_applications').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const rows = await query;
    if (!rows.error) return rows.data as EditorApplicationRecord[];
  }

  if (!status) return [...runtimeEditorApplications];
  return runtimeEditorApplications.filter((item) => item.status === status);
}

export async function createEditorInvite(input: {
  applicant_email: string;
  invited_by_email: string;
  application_id?: string;
  expires_in_days?: number;
}) {
  const now = new Date();
  const expiresIn = Math.max(1, Math.min(30, input.expires_in_days ?? 7));
  const expiresAt = new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000).toISOString();

  const record: EditorInviteRecord = {
    id: randomUUID(),
    applicant_email: input.applicant_email,
    invite_code: generateInviteCode(),
    invited_by_email: input.invited_by_email,
    application_id: input.application_id ?? null,
    status: 'active',
    expires_at: expiresAt,
    used_at: null,
    created_at: now.toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('editor_invites').insert(record).select('*').maybeSingle();
    if (!inserted.error) {
      if (input.application_id) {
        await supabase
          .from('editor_applications')
          .update({ status: 'approved', reviewed_by_email: input.invited_by_email, reviewed_at: now.toISOString(), updated_at: now.toISOString() })
          .eq('id', input.application_id);
      }

      return { data: (inserted.data ?? record) as EditorInviteRecord, mode: 'supabase' };
    }
  }

  runtimeEditorInvites.unshift(record);
  if (input.application_id) {
    const target = runtimeEditorApplications.find((item) => item.id === input.application_id);
    if (target) {
      target.status = 'approved';
      target.reviewed_by_email = input.invited_by_email;
      target.reviewed_at = now.toISOString();
      target.updated_at = now.toISOString();
    }
  }

  return { data: record, mode: 'memory' };
}

export async function validateAndConsumeEditorInvite(input: { applicant_email: string; invite_code: string }) {
  const nowIso = new Date().toISOString();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const row = await supabase
      .from('editor_invites')
      .select('*')
      .eq('applicant_email', input.applicant_email)
      .eq('invite_code', input.invite_code)
      .eq('status', 'active')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row.error && row.data) {
      await supabase
        .from('editor_invites')
        .update({ status: 'used', used_at: nowIso })
        .eq('id', (row.data as EditorInviteRecord).id);
      return { matched: true, source: 'supabase' as const, invite: row.data as EditorInviteRecord };
    }
  }

  const invite = runtimeEditorInvites.find(
    (item) =>
      item.applicant_email === input.applicant_email &&
      item.invite_code === input.invite_code &&
      item.status === 'active' &&
      item.expires_at > nowIso
  );

  if (!invite) return { matched: false, source: 'none' as const };
  invite.status = 'used';
  invite.used_at = nowIso;
  return { matched: true, source: 'memory' as const, invite };
}
