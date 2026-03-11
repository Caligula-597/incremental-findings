import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { canTransitionStatus } from '@/lib/workflow';
import { mapDecisionToStatus, recordEditorDecision } from '@/lib/review-service';

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const decision = String(body?.decision ?? '').trim().toLowerCase();
    const reason = String(body?.reason ?? '').trim();

    if (!['accept', 'reject', 'revise'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be accept/reject/revise' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const mappedStatus = mapDecisionToStatus(decision as 'accept' | 'reject' | 'revise');
    if (!canTransitionStatus(submission.status, mappedStatus)) {
      return NextResponse.json({ error: `Invalid workflow transition: ${submission.status} -> ${mappedStatus}` }, { status: 409 });
    }

    const updated = await updateSubmissionStatus(submission.id, mappedStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found during update' }, { status: 404 });
    }

    const decisionRecord = await recordEditorDecision({
      submissionId: submission.id,
      decision: decision as 'accept' | 'reject' | 'revise',
      reason,
      editorEmail: sessionUser.email,
      mappedStatus
    });

    return NextResponse.json({ data: { submission: updated, decision: decisionRecord } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
