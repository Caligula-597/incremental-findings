import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById } from '@/lib/submission-repository';
import { createIndexingExport } from '@/lib/indexing-service';

const supportedProviders = new Set(['crossref', 'doaj', 'openalex']);

export async function POST(request: Request, context: { params: { provider: string } }) {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const provider = String(context.params.provider ?? '').trim().toLowerCase();
    if (!supportedProviders.has(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    const body = await request.json();
    const submissionId = String(body?.submission_id ?? '').trim();
    if (!submissionId) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission || submission.status !== 'published') {
      return NextResponse.json({ error: 'Published submission not found' }, { status: 404 });
    }

    const data = await createIndexingExport({
      submission,
      provider,
      actorEmail: user.email
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
