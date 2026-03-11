import { NextResponse } from 'next/server';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { SubmissionStatus } from '@/lib/types';
import { getServerSessionUser } from '@/lib/session';
import { canTransitionStatus, requiresDecisionReason } from '@/lib/workflow';

const allowedStatus = new Set<SubmissionStatus>(['pending', 'under_review', 'published', 'rejected']);

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const nextStatus = body?.status as SubmissionStatus | undefined;
    const decisionReason = String(body?.reason ?? '').trim();

    if (!nextStatus || !allowedStatus.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await getSubmissionById(context.params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!canTransitionStatus(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          error: `Invalid workflow transition: ${existing.status} -> ${nextStatus}`
        },
        { status: 409 }
      );
    }

    if (requiresDecisionReason(nextStatus) && !decisionReason) {
      return NextResponse.json({ error: 'Decision reason is required for rejection' }, { status: 400 });
    }

    const updated = await updateSubmissionStatus(context.params.id, nextStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: updated,
      actor: sessionUser.email,
      reason: decisionReason || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
