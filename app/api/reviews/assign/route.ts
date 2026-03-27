import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById } from '@/lib/submission-repository';
import { assignReviewer } from '@/lib/review-service';
import { getReviewPolicyConfig, reviewerConflictsWithAuthors } from '@/lib/review-policy';

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const submissionId = String(body?.submission_id ?? '').trim();
    const reviewerEmail = String(body?.reviewer_email ?? '').trim().toLowerCase();
    const dueAt = body?.due_at ? String(body.due_at) : null;
    const roundIndex = Number(body?.round_index ?? 1);

    if (!submissionId || !reviewerEmail.includes('@')) {
      return NextResponse.json({ error: 'submission_id and reviewer_email are required' }, { status: 400 });
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }


    const policy = getReviewPolicyConfig();
    const coiDisclosure = body?.coi_disclosure ? String(body.coi_disclosure).trim() : '';

    if (policy.enforceReviewerAuthorSeparation && reviewerConflictsWithAuthors(reviewerEmail, submission.authors)) {
      return NextResponse.json({ error: 'Reviewer conflict detected: reviewer appears in author metadata' }, { status: 409 });
    }

    if (policy.requireCoiDisclosure && !coiDisclosure) {
      return NextResponse.json({ error: 'coi_disclosure is required by current review policy' }, { status: 400 });
    }
    const assignment = await assignReviewer({
      submissionId,
      reviewerEmail,
      editorEmail: sessionUser.email,
      roundIndex: Number.isFinite(roundIndex) ? Math.max(1, roundIndex) : 1,
      dueAt: dueAt ?? new Date(Date.now() + policy.defaultReviewDueDays * 24 * 60 * 60 * 1000).toISOString()
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
