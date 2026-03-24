import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { readRuntimeAuditLogs, writeRuntimeAuditLogs } from '@/lib/runtime-persistence';
import { runtimeAuditLogs, runtimeEditorApplications, runtimeEditorInvites } from '@/lib/runtime-store';
import { EditorApplicationRecord } from '@/lib/types';
import { SessionUser } from '@/lib/session';

export type EditorialRole = 'managing_editor' | 'review_editor';

export interface EditorAssignmentRecord {
  id: string;
  submission_id: string;
  assigned_editor_email: string;
  assigned_by_email: string;
  created_at: string;
}

const assignmentAction = 'editor_submission_assigned';

function parseJsonDetail<T>(detail: string): T | null {
  try {
    return JSON.parse(detail) as T;
  } catch {
    return null;
  }
}

export function getManagingEditors() {
  return String(process.env.MANAGING_EDITOR_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function canUseManagingEditorCode(email: string) {
  const normalized = email.trim().toLowerCase();
  const allowlist = getManagingEditors();
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalized);
}

export function isManagingEditor(userOrEmail: string | Pick<SessionUser, 'email' | 'editor_role'>, editorRole?: EditorialRole | null) {
  const normalized = typeof userOrEmail === 'string' ? userOrEmail.trim().toLowerCase() : userOrEmail.email.trim().toLowerCase();
  const roleHint = typeof userOrEmail === 'string' ? editorRole : userOrEmail.editor_role;
  if (roleHint) return roleHint === 'managing_editor';
  return getManagingEditors().includes(normalized);
}

export function getEditorialRole(userOrEmail: string | Pick<SessionUser, 'email' | 'editor_role'>): EditorialRole {
  if (typeof userOrEmail !== 'string' && userOrEmail.editor_role) {
    return userOrEmail.editor_role;
  }
  return isManagingEditor(userOrEmail) ? 'managing_editor' : 'review_editor';
}

export async function createSubmissionEditorAssignment(input: {
  submissionId: string;
  assignedEditorEmail: string;
  assignedByEmail: string;
}) {
  const assignedEditorEmail = input.assignedEditorEmail.trim().toLowerCase();
  const assignedByEmail = input.assignedByEmail.trim().toLowerCase();
  const record: EditorAssignmentRecord = {
    id: randomUUID(),
    submission_id: input.submissionId,
    assigned_editor_email: assignedEditorEmail,
    assigned_by_email: assignedByEmail,
    created_at: new Date().toISOString()
  };

  const audit = {
    id: record.id,
    submission_id: record.submission_id,
    action: assignmentAction,
    actor_email: record.assigned_by_email,
    detail: JSON.stringify({ assigned_editor_email: record.assigned_editor_email }),
    created_at: record.created_at
  };

  runtimeAuditLogs.push(audit);
  writeRuntimeAuditLogs(runtimeAuditLogs);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    await supabase.from('audit_logs').insert(audit);
  }

  return record;
}

export async function listSubmissionEditorAssignments(submissionIds: string[]) {
  const ids = Array.from(new Set(submissionIds.filter(Boolean)));
  const assignments: EditorAssignmentRecord[] = [];
  const supabase = getSupabaseServerClient();

  if (supabase && ids.length > 0) {
    const rows = await supabase
      .from('audit_logs')
      .select('id,submission_id,action,actor_email,detail,created_at')
      .in('submission_id', ids)
      .eq('action', assignmentAction)
      .order('created_at', { ascending: false });

    if (!rows.error) {
      for (const row of rows.data ?? []) {
        const parsed = parseJsonDetail<{ assigned_editor_email?: string }>(String((row as { detail: string }).detail ?? ''));
        const assignedEditorEmail = parsed?.assigned_editor_email?.trim().toLowerCase();
        if (!assignedEditorEmail) continue;
        assignments.push({
          id: String((row as { id: string }).id),
          submission_id: String((row as { submission_id: string }).submission_id),
          assigned_by_email: String((row as { actor_email: string }).actor_email).toLowerCase(),
          assigned_editor_email: assignedEditorEmail,
          created_at: String((row as { created_at: string }).created_at)
        });
      }
    }
  }

  if (assignments.length === 0) {
    const logs = readRuntimeAuditLogs();
    const source = logs.length > 0 ? logs : runtimeAuditLogs;
    for (const row of source) {
      if (row.action !== assignmentAction || !ids.includes(row.submission_id)) continue;
      const parsed = parseJsonDetail<{ assigned_editor_email?: string }>(row.detail);
      const assignedEditorEmail = parsed?.assigned_editor_email?.trim().toLowerCase();
      if (!assignedEditorEmail) continue;
      assignments.push({
        id: row.id,
        submission_id: row.submission_id,
        assigned_by_email: row.actor_email.toLowerCase(),
        assigned_editor_email: assignedEditorEmail,
        created_at: row.created_at
      });
    }
  }

  const grouped: Record<string, EditorAssignmentRecord[]> = {};
  for (const id of ids) {
    const latestByEditor = new Map<string, EditorAssignmentRecord>();
    const current = assignments
      .filter((item) => item.submission_id === id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    for (const row of current) {
      if (!latestByEditor.has(row.assigned_editor_email)) {
        latestByEditor.set(row.assigned_editor_email, row);
      }
    }

    grouped[id] = Array.from(latestByEditor.values()).sort((a, b) => a.assigned_editor_email.localeCompare(b.assigned_editor_email));
  }

  return grouped;
}

export async function listAssignedSubmissionIdsForEditor(email: string) {
  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseServerClient();
  const ids = new Set<string>();

  if (supabase) {
    const rows = await supabase
      .from('audit_logs')
      .select('submission_id,detail,created_at')
      .eq('action', assignmentAction)
      .order('created_at', { ascending: false });

    if (!rows.error) {
      const seen = new Set<string>();
      for (const row of rows.data ?? []) {
        const submissionId = String((row as { submission_id: string }).submission_id);
        if (seen.has(submissionId)) continue;
        const parsed = parseJsonDetail<{ assigned_editor_email?: string }>(String((row as { detail: string }).detail ?? ''));
        seen.add(submissionId);
        if (parsed?.assigned_editor_email?.trim().toLowerCase() === normalized) {
          ids.add(submissionId);
        }
      }
    }
  }

  if (ids.size === 0) {
    const logs = readRuntimeAuditLogs();
    const source = logs.length > 0 ? logs : runtimeAuditLogs;
    const sorted = [...source].filter((row) => row.action === assignmentAction).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const seen = new Set<string>();
    for (const row of sorted) {
      if (seen.has(row.submission_id)) continue;
      seen.add(row.submission_id);
      const parsed = parseJsonDetail<{ assigned_editor_email?: string }>(row.detail);
      if (parsed?.assigned_editor_email?.trim().toLowerCase() === normalized) {
        ids.add(row.submission_id);
      }
    }
  }

  return Array.from(ids);
}

function mergeRosterEmail(
  map: Map<string, { email: string; role: EditorialRole; source: string }>,
  email: string,
  source: string,
  roleHint?: EditorialRole
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const role = roleHint ?? (getManagingEditors().includes(normalized) ? 'managing_editor' : 'review_editor');
  const existing = map.get(normalized);
  if (!existing) {
    map.set(normalized, { email: normalized, role, source });
    return;
  }

  if (existing.role !== 'managing_editor' && role === 'managing_editor') {
    existing.role = role;
  }
  existing.source = `${existing.source}, ${source}`;
}

export async function listEditorialRoster() {
  const roster = new Map<string, { email: string; role: EditorialRole; source: string }>();

  for (const email of getManagingEditors()) {
    mergeRosterEmail(roster, email, 'managing_allowlist', 'managing_editor');
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const [applications, invites, logs] = await Promise.all([
      supabase.from('editor_applications').select('applicant_email,status').eq('status', 'approved'),
      supabase.from('editor_invites').select('applicant_email,status'),
      supabase.from('audit_logs').select('actor_email,action,detail').in('action', ['editor_review_recommendation', assignmentAction, 'editor_review_final_decision'])
    ]);

    if (!applications.error) {
      for (const row of (applications.data ?? []) as Pick<EditorApplicationRecord, 'applicant_email'>[]) {
        mergeRosterEmail(roster, row.applicant_email, 'approved_application', 'review_editor');
      }
    }

    if (!invites.error) {
      for (const row of invites.data ?? []) {
        mergeRosterEmail(roster, String((row as { applicant_email: string }).applicant_email), 'editor_invite', 'review_editor');
      }
    }

    if (!logs.error) {
      for (const row of logs.data ?? []) {
        const action = String((row as { action: string }).action);
        mergeRosterEmail(roster, String((row as { actor_email: string }).actor_email), action, action === 'editor_review_final_decision' ? 'managing_editor' : 'review_editor');
        if (action === assignmentAction) {
          const parsed = parseJsonDetail<{ assigned_editor_email?: string }>(String((row as { detail: string }).detail ?? ''));
          if (parsed?.assigned_editor_email) {
            mergeRosterEmail(roster, parsed.assigned_editor_email, action, 'review_editor');
          }
        }
      }
    }
  }

  for (const row of runtimeEditorApplications.filter((item) => item.status === 'approved')) {
    mergeRosterEmail(roster, row.applicant_email, 'approved_application', 'review_editor');
  }
  for (const row of runtimeEditorInvites) {
    mergeRosterEmail(roster, row.applicant_email, 'editor_invite', 'review_editor');
  }
  for (const row of runtimeAuditLogs) {
    if (!['editor_review_recommendation', assignmentAction, 'editor_review_final_decision'].includes(row.action)) continue;
    mergeRosterEmail(roster, row.actor_email, row.action, row.action === 'editor_review_final_decision' ? 'managing_editor' : 'review_editor');
    if (row.action === assignmentAction) {
      const parsed = parseJsonDetail<{ assigned_editor_email?: string }>(row.detail);
      if (parsed?.assigned_editor_email) {
        mergeRosterEmail(roster, parsed.assigned_editor_email, row.action, 'review_editor');
      }
    }
  }

  return Array.from(roster.values()).sort((a, b) => {
    if (a.role !== b.role) return a.role === 'managing_editor' ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
}
