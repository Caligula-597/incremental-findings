import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById } from '@/lib/submission-repository';
import { listSubmissionTimelineEvents } from '@/lib/submission-timeline-service';

function canViewSubmission(sessionUser: { id: string; email: string; role: 'author' | 'editor' }, submission: {
  author_id?: string | null;
  submitter_email?: string | null;
  authors?: string | null;
}) {
  if (sessionUser.role === 'editor') {
    return true;
  }

  const email = sessionUser.email.toLowerCase();
  return Boolean(
    (submission.author_id && submission.author_id === sessionUser.id) ||
      (submission.submitter_email && submission.submitter_email.toLowerCase() === email) ||
      (submission.authors && submission.authors.toLowerCase().includes(email))
  );
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const submission = await getSubmissionById(params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!canViewSubmission(sessionUser, submission)) {
      return NextResponse.json({ error: 'You do not have access to this submission timeline' }, { status: 403 });
    }

    const events = await listSubmissionTimelineEvents(submission.id);

    const systemEvent = {
      id: `system-created:${submission.id}`,
      type: 'system' as const,
      action: 'submission_created',
      title: 'Submission received',
      detail: `Initial status: ${submission.status}`,
      actor_email: submission.submitter_email ?? null,
      created_at: submission.created_at
    };

    const merged = [systemEvent, ...events]
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
      .filter((event, index, arr) => {
        const prev = arr[index - 1];
        if (!prev) return true;
        return !(prev.action === event.action && prev.created_at === event.created_at && prev.detail === event.detail);
      });

    return NextResponse.json({
      data: {
        submission: {
          id: submission.id,
          title: submission.title,
          status: submission.status,
          created_at: submission.created_at,
          doi: submission.doi ?? null
        },
        events: merged
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
