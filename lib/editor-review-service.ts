import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { readRuntimeAuditLogs, writeRuntimeAuditLogs } from '@/lib/runtime-persistence';
import { runtimeAuditLogs } from '@/lib/runtime-store';
import { SubmissionStatus } from '@/lib/types';

export type EditorRecommendation = 'publish' | 'major_revision' | 'minor_revision' | 'reject';

export interface EditorRecommendationRecord {
  id: string;
  submission_id: string;
  editor_email: string;
  recommendation: EditorRecommendation;
  comment: string;
  created_at: string;
}

export interface EditorFinalDecisionRecord {
  id: string;
  submission_id: string;
  managing_editor_email: string;
  final_decision: EditorRecommendation;
  summary: string;
  created_at: string;
}

const recommendationAction = 'editor_review_recommendation';
const finalDecisionAction = 'editor_review_final_decision';

function parseJsonDetail<T>(detail: string): T | null {
  try {
    return JSON.parse(detail) as T;
  } catch {
    return null;
  }
}

function getManagingEditors() {
  return String(process.env.MANAGING_EDITOR_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isManagingEditor(email: string) {
  const allowlist = getManagingEditors();
  if (allowlist.length === 0) return true;
  return allowlist.includes(email.toLowerCase());
}

function mapDecisionToStatus(decision: EditorRecommendation): SubmissionStatus {
  if (decision === 'publish') return 'published';
  if (decision === 'reject') return 'rejected';
  return 'pending';
}

export function mapFinalDecisionToStatus(decision: EditorRecommendation): SubmissionStatus {
  return mapDecisionToStatus(decision);
}

export async function createEditorRecommendation(input: {
  submissionId: string;
  editorEmail: string;
  recommendation: EditorRecommendation;
  comment: string;
}) {
  const now = new Date().toISOString();
  const record: EditorRecommendationRecord = {
    id: randomUUID(),
    submission_id: input.submissionId,
    editor_email: input.editorEmail,
    recommendation: input.recommendation,
    comment: input.comment,
    created_at: now
  };

  const audit = {
    id: record.id,
    submission_id: record.submission_id,
    action: recommendationAction,
    actor_email: record.editor_email,
    detail: JSON.stringify({ recommendation: record.recommendation, comment: record.comment }),
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

export async function createEditorFinalDecision(input: {
  submissionId: string;
  managingEditorEmail: string;
  finalDecision: EditorRecommendation;
  summary: string;
}) {
  const now = new Date().toISOString();
  const record: EditorFinalDecisionRecord = {
    id: randomUUID(),
    submission_id: input.submissionId,
    managing_editor_email: input.managingEditorEmail,
    final_decision: input.finalDecision,
    summary: input.summary,
    created_at: now
  };

  const audit = {
    id: record.id,
    submission_id: record.submission_id,
    action: finalDecisionAction,
    actor_email: record.managing_editor_email,
    detail: JSON.stringify({ final_decision: record.final_decision, summary: record.summary }),
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

export async function listReviewBoard(submissionIds: string[]) {
  const ids = Array.from(new Set(submissionIds.filter(Boolean)));
  const recommendations: EditorRecommendationRecord[] = [];
  const finals: EditorFinalDecisionRecord[] = [];

  const supabase = getSupabaseServerClient();

  if (supabase && ids.length > 0) {
    const logs = await supabase
      .from('audit_logs')
      .select('id,submission_id,action,actor_email,detail,created_at')
      .in('submission_id', ids)
      .in('action', [recommendationAction, finalDecisionAction])
      .order('created_at', { ascending: false });

    if (!logs.error) {
      for (const row of logs.data ?? []) {
        const item = row as { id: string; submission_id: string; action: string; actor_email: string; detail: string; created_at: string };
        if (item.action === recommendationAction) {
          const parsed = parseJsonDetail<{ recommendation: EditorRecommendation; comment?: string }>(item.detail);
          if (parsed?.recommendation) {
            recommendations.push({
              id: item.id,
              submission_id: item.submission_id,
              editor_email: item.actor_email,
              recommendation: parsed.recommendation,
              comment: parsed.comment ?? '',
              created_at: item.created_at
            });
          }
        }
        if (item.action === finalDecisionAction) {
          const parsed = parseJsonDetail<{ final_decision: EditorRecommendation; summary?: string }>(item.detail);
          if (parsed?.final_decision) {
            finals.push({
              id: item.id,
              submission_id: item.submission_id,
              managing_editor_email: item.actor_email,
              final_decision: parsed.final_decision,
              summary: parsed.summary ?? '',
              created_at: item.created_at
            });
          }
        }
      }
    }
  }

  if (recommendations.length === 0 && finals.length === 0) {
    const logs = readRuntimeAuditLogs();
    const source = logs.length > 0 ? logs : runtimeAuditLogs;
    for (const row of source) {
      if (!ids.includes(row.submission_id)) continue;
      if (row.action === recommendationAction) {
        const parsed = parseJsonDetail<{ recommendation: EditorRecommendation; comment?: string }>(row.detail);
        if (parsed?.recommendation) {
          recommendations.push({
            id: row.id,
            submission_id: row.submission_id,
            editor_email: row.actor_email,
            recommendation: parsed.recommendation,
            comment: parsed.comment ?? '',
            created_at: row.created_at
          });
        }
      }
      if (row.action === finalDecisionAction) {
        const parsed = parseJsonDetail<{ final_decision: EditorRecommendation; summary?: string }>(row.detail);
        if (parsed?.final_decision) {
          finals.push({
            id: row.id,
            submission_id: row.submission_id,
            managing_editor_email: row.actor_email,
            final_decision: parsed.final_decision,
            summary: parsed.summary ?? '',
            created_at: row.created_at
          });
        }
      }
    }
  }

  const grouped: Record<string, {
    recommendations: EditorRecommendationRecord[];
    final_decision: EditorFinalDecisionRecord | null;
    recommendation_count: number;
    can_finalize: boolean;
  }> = {};

  for (const id of ids) {
    const recs = recommendations
      .filter((item) => item.submission_id === id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    const latestByEditor = new Map<string, EditorRecommendationRecord>();
    for (const rec of recs) {
      const key = rec.editor_email.toLowerCase();
      if (!latestByEditor.has(key)) latestByEditor.set(key, rec);
    }

    const final = finals
      .filter((item) => item.submission_id === id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0] ?? null;

    grouped[id] = {
      recommendations: Array.from(latestByEditor.values()),
      final_decision: final,
      recommendation_count: latestByEditor.size,
      can_finalize: latestByEditor.size >= 3
    };
  }

  return grouped;
}
