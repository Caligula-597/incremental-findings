import { NextResponse } from 'next/server';
import { updateSubmissionStatus } from '@/lib/submission-repository';
import { SubmissionStatus } from '@/lib/types';
import { getServerSessionUser } from '@/lib/session';

const allowedStatus = new Set<SubmissionStatus>(['pending', 'under_review', 'published', 'rejected']);

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const nextStatus = body?.status as SubmissionStatus | undefined;

    if (!nextStatus || !allowedStatus.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await updateSubmissionStatus(context.params.id, nextStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated, actor: sessionUser.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
