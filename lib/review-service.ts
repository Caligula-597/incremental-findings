import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeEditorDecisions, runtimeReviewAssignments, runtimeReviewReports } from '@/lib/runtime-store';
import { EditorDecisionRecord, ReviewAssignmentRecord, ReviewReportRecord, SubmissionStatus } from '@/lib/types';

export async function assignReviewer(input: {
  submissionId: string;
  reviewerEmail: string;
  editorEmail: string;
  roundIndex?: number;
  dueAt?: string | null;
}): Promise<ReviewAssignmentRecord> {
  const createdAt = new Date().toISOString();
  const assignment: ReviewAssignmentRecord = {
    id: randomUUID(),
    submission_id: input.submissionId,
    reviewer_email: input.reviewerEmail,
    editor_email: input.editorEmail,
    round_index: input.roundIndex ?? 1,
    status: 'invited',
    due_at: input.dueAt ?? null,
    responded_at: null,
    created_at: createdAt
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('review_assignments').insert(assignment).select('*').single();
    if (!inserted.error && inserted.data) {
      return inserted.data as ReviewAssignmentRecord;
    }
  }

  runtimeReviewAssignments.unshift(assignment);
  return assignment;
}

export async function respondReviewInvitation(input: {
  assignmentId: string;
  reviewerEmail: string;
  response: 'accepted' | 'declined';
}) {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (supabase) {
    const update = await supabase
      .from('review_assignments')
      .update({ status: input.response, responded_at: now })
      .eq('id', input.assignmentId)
      .eq('reviewer_email', input.reviewerEmail)
      .select('*')
      .maybeSingle();
    if (!update.error && update.data) {
      return update.data as ReviewAssignmentRecord;
    }
  }

  const assignment = runtimeReviewAssignments.find((item) => item.id === input.assignmentId);
  if (!assignment) return null;
  if (assignment.reviewer_email !== input.reviewerEmail) return null;
  assignment.status = input.response;
  assignment.responded_at = now;
  return assignment;
}

export async function submitReviewReport(input: {
  assignmentId: string;
  reviewerEmail: string;
  recommendation: ReviewReportRecord['recommendation'];
  summary: string;
  confidentialNote?: string;
}): Promise<ReviewReportRecord | null> {
  const supabase = getSupabaseServerClient();
  const assignment = await getReviewAssignmentById(input.assignmentId);
  if (!assignment) return null;
  if (assignment.reviewer_email !== input.reviewerEmail) return null;

  const report: ReviewReportRecord = {
    id: randomUUID(),
    submission_id: assignment.submission_id,
    assignment_id: assignment.id,
    reviewer_email: input.reviewerEmail,
    recommendation: input.recommendation,
    summary: input.summary,
    confidential_note: input.confidentialNote ?? null,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const inserted = await supabase.from('review_reports').insert(report).select('*').single();
    if (!inserted.error && inserted.data) {
      await supabase.from('review_assignments').update({ status: 'completed' }).eq('id', assignment.id);
      return inserted.data as ReviewReportRecord;
    }
  }

  runtimeReviewReports.unshift(report);
  assignment.status = 'completed';
  return report;
}

export async function getReviewAssignmentById(assignmentId: string): Promise<ReviewAssignmentRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const query = await supabase.from('review_assignments').select('*').eq('id', assignmentId).maybeSingle();
    if (!query.error && query.data) {
      return query.data as ReviewAssignmentRecord;
    }
  }

  return runtimeReviewAssignments.find((item) => item.id === assignmentId) ?? null;
}

export async function listSubmissionReviewReports(submissionId: string): Promise<ReviewReportRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const query = await supabase.from('review_reports').select('*').eq('submission_id', submissionId).order('created_at', { ascending: false });
    if (!query.error) {
      return (query.data ?? []) as ReviewReportRecord[];
    }
  }

  return runtimeReviewReports.filter((item) => item.submission_id === submissionId);
}

export function mapDecisionToStatus(decision: EditorDecisionRecord['decision']): SubmissionStatus {
  if (decision === 'accept') return 'published';
  if (decision === 'reject') return 'rejected';
  return 'pending';
}

export async function recordEditorDecision(input: {
  submissionId: string;
  decision: EditorDecisionRecord['decision'];
  reason: string;
  editorEmail: string;
  mappedStatus: SubmissionStatus;
}): Promise<EditorDecisionRecord> {
  const record: EditorDecisionRecord = {
    id: randomUUID(),
    submission_id: input.submissionId,
    decision: input.decision,
    mapped_status: input.mappedStatus,
    reason: input.reason,
    editor_email: input.editorEmail,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('editor_decisions').insert(record).select('*').single();
    if (!inserted.error && inserted.data) {
      return inserted.data as EditorDecisionRecord;
    }
  }

  runtimeEditorDecisions.unshift(record);
  return record;
}
