import { getSupabaseServerClient } from '@/lib/supabase';
import { readRuntimeAuditLogs } from '@/lib/runtime-persistence';
import { runtimeAuditLogs } from '@/lib/runtime-store';

export interface SubmissionTimelineEvent {
  id: string;
  type: 'system' | 'audit';
  action: string;
  title: string;
  detail: string;
  actor_email: string | null;
  created_at: string;
}

const actionTitleMap: Record<string, string> = {
  submission_created: 'Submission received',
  submission_status_updated: 'Status updated',
  editor_status_updated: 'Editor status update',
  editor_submission_assigned: 'Reviewer assignment updated',
  editor_review_recommendation: 'Review recommendation recorded',
  editor_review_final_decision: 'Final editorial decision',
  production_started: 'Production started',
  production_proof_ready: 'Proof stage reached',
  production_package_published: 'Publication package generated',
  submission_published: 'Submission published',
  submission_doi_assigned: 'DOI assigned'
};

function toTimelineEvent(input: {
  action: string;
  detail?: string | null;
  actor_email?: string | null;
  created_at: string;
}): SubmissionTimelineEvent {
  const action = input.action || 'event';
  const detail = String(input.detail ?? '').trim();
  const title = actionTitleMap[action] ?? action.replaceAll('_', ' ');

  return {
    id: `${action}:${input.created_at}`,
    type: 'audit',
    action,
    title,
    detail: detail || title,
    actor_email: input.actor_email ?? null,
    created_at: input.created_at
  };
}

export async function listSubmissionTimelineEvents(submissionId: string): Promise<SubmissionTimelineEvent[]> {
  const events: SubmissionTimelineEvent[] = [];
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const rows = await supabase
      .from('audit_logs')
      .select('action,detail,actor_email,created_at')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })
      .limit(500);

    if (!rows.error) {
      for (const item of rows.data ?? []) {
        const typed = item as { action: string; detail?: string | null; actor_email?: string | null; created_at: string };
        events.push(toTimelineEvent(typed));
      }
    }
  }

  if (events.length === 0) {
    const persisted = readRuntimeAuditLogs();
    const source = persisted.length > 0 ? persisted : runtimeAuditLogs;

    for (const row of source
      .filter((item) => item.submission_id === submissionId)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))) {
      events.push(
        toTimelineEvent({
          action: row.action,
          detail: row.detail,
          actor_email: row.actor_email,
          created_at: row.created_at
        })
      );
    }
  }

  return events;
}
