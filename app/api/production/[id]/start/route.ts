import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { startProductionPipeline } from '@/lib/production-service';
import { canTransitionStatus } from '@/lib/workflow';
import { isManagingEditor } from '@/lib/editor-workspace-service';

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }
    if (!isManagingEditor(user.email)) {
      return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (!canTransitionStatus(submission.status, 'in_production')) {
      return NextResponse.json({ error: `Invalid workflow transition: ${submission.status} -> in_production` }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const note = String(body?.note ?? '').trim();

    const [data, updatedSubmission] = await Promise.all([
      startProductionPipeline({
        submissionId: submission.id,
        editorEmail: user.email,
        note: note || undefined
      }),
      updateSubmissionStatus(submission.id, 'in_production')
    ]);

    return NextResponse.json({ data: { production: data, submission: updatedSubmission ?? submission } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
