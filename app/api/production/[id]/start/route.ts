import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById } from '@/lib/submission-repository';
import { startProductionPipeline } from '@/lib/production-service';

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const note = String(body?.note ?? '').trim();

    const data = await startProductionPipeline({
      submissionId: submission.id,
      editorEmail: user.email,
      note: note || undefined
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
