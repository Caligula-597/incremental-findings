import { NextResponse } from 'next/server';
import { getSubmissionById, publishSubmission } from '@/lib/submission-repository';
import { getServerSessionUser } from '@/lib/session';
import { isManagingEditor } from '@/lib/editor-workspace-service';
import { canTransitionStatus } from '@/lib/workflow';

export async function POST(_: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }
    if (!isManagingEditor(sessionUser)) {
      return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
    }

    const existing = await getSubmissionById(context.params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!canTransitionStatus(existing.status, 'published')) {
      return NextResponse.json({ error: `Invalid workflow transition: ${existing.status} -> published` }, { status: 409 });
    }

    const updated = await publishSubmission(context.params.id);

    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated, actor: sessionUser.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
