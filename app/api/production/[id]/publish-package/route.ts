import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { canTransitionStatus } from '@/lib/workflow';
import { publishProductionPackage } from '@/lib/production-service';

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

    const body = await request.json();
    const packageUrl = String(body?.package_url ?? '').trim();
    const checksum = String(body?.checksum ?? '').trim();
    const note = String(body?.note ?? '').trim();

    if (!packageUrl) {
      return NextResponse.json({ error: 'package_url is required' }, { status: 400 });
    }

    const result = await publishProductionPackage({
      submissionId: submission.id,
      editorEmail: user.email,
      packageUrl,
      checksum: checksum || undefined,
      note: note || undefined
    });

    let updatedSubmission = submission;
    if (submission.status !== 'published' && canTransitionStatus(submission.status, 'published')) {
      const next = await updateSubmissionStatus(submission.id, 'published');
      if (next) {
        updatedSubmission = next;
      }
    }

    return NextResponse.json({
      data: {
        production: result,
        submission: updatedSubmission
      }
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
