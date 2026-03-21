import { NextResponse } from 'next/server';
import { createEditorFinalDecision, EditorRecommendation, listReviewBoard, mapFinalDecisionToStatus } from '@/lib/editor-review-service';
import { getServerSessionUser } from '@/lib/session';
import { isManagingEditor, listSubmissionEditorAssignments } from '@/lib/editor-workspace-service';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { canTransitionStatus } from '@/lib/workflow';

const allowed = new Set<EditorRecommendation>(['accept', 'major_revision', 'minor_revision', 'reject']);

export async function POST(request: Request) {
  try {
    const user = getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }
    if (!isManagingEditor(user.email)) {
      return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const submissionId = String(body?.submission_id ?? '').trim();
    const finalDecision = String(body?.final_decision ?? '').trim() as EditorRecommendation;
    const summary = String(body?.summary ?? '').trim();

    if (!submissionId) return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
    if (!allowed.has(finalDecision)) return NextResponse.json({ error: 'Invalid final_decision' }, { status: 400 });

    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (submission.status !== 'under_review') {
      return NextResponse.json({ error: 'Only under_review submissions can receive a final decision' }, { status: 409 });
    }

    const [board, assignmentMap] = await Promise.all([
      listReviewBoard([submissionId]),
      listSubmissionEditorAssignments([submissionId])
    ]);
    const row = board[submissionId];
    const assignedEditors = assignmentMap[submissionId] ?? [];
    if (assignedEditors.length === 0) {
      return NextResponse.json({ error: 'Assign at least one review editor before finalizing' }, { status: 409 });
    }
    if (!row || row.recommendation_count < 1) {
      return NextResponse.json({ error: 'Collect at least one review editor recommendation before finalizing' }, { status: 409 });
    }

    const status = mapFinalDecisionToStatus(finalDecision);
    if (!canTransitionStatus(submission.status, status)) {
      return NextResponse.json({ error: `Invalid workflow transition: ${submission.status} -> ${status}` }, { status: 409 });
    }

    const updated = await updateSubmissionStatus(submissionId, status);
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const decision = await createEditorFinalDecision({
      submissionId,
      managingEditorEmail: user.email,
      finalDecision,
      summary
    });

    return NextResponse.json({ data: { decision, submission: updated } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
