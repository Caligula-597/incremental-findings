import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import {
  createEditorFinalDecision,
  EditorRecommendation,
  isManagingEditor,
  listReviewBoard,
  mapFinalDecisionToStatus
} from '@/lib/editor-review-service';
import { updateSubmissionStatus } from '@/lib/submission-repository';

const allowed = new Set<EditorRecommendation>(['publish', 'major_revision', 'minor_revision', 'reject']);

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

    const board = await listReviewBoard([submissionId]);
    const row = board[submissionId];
    if (!row || row.recommendation_count < 3) {
      return NextResponse.json({ error: 'At least 3 editor recommendations are required before finalizing' }, { status: 409 });
    }

    const status = mapFinalDecisionToStatus(finalDecision);
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
