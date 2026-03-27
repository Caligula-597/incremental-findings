import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { isManagingEditor } from '@/lib/editor-workspace-service';
import { getSubmissionById } from '@/lib/submission-repository';
import { listProductionEvents } from '@/lib/production-service';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }
    if (!isManagingEditor(user)) {
      return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const data = await listProductionEvents(submission.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
