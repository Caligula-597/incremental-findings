import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { canTransitionStatus } from '@/lib/workflow';
import { publishProductionPackage } from '@/lib/production-service';
import { isManagingEditor } from '@/lib/editor-workspace-service';

export async function POST(request: Request, context: { params: { id: string } }) {
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
    if (!canTransitionStatus(submission.status, 'published')) {
      return NextResponse.json({ error: `Invalid workflow transition: ${submission.status} -> published` }, { status: 409 });
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

    const updatedSubmission = await updateSubmissionStatus(submission.id, 'published');

    return NextResponse.json({
      data: {
        production: result,
        submission: updatedSubmission ?? submission
      }
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
