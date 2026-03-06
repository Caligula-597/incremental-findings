import { NextRequest, NextResponse } from 'next/server';
import { createSubmission, listSubmissions } from '@/lib/submission-repository';
import { SubmissionStatus } from '@/lib/types';

const allowedStatus = new Set<SubmissionStatus>(['pending', 'under_review', 'published', 'rejected']);

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') as SubmissionStatus | null;
    if (status && !allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const data = await listSubmissions(status ?? undefined);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.authors) {
      return NextResponse.json({ error: 'Missing required fields: title, authors' }, { status: 400 });
    }

    const created = await createSubmission({
      title: String(body.title),
      authors: String(body.authors),
      abstract: body.abstract ? String(body.abstract) : undefined,
      file_url: body.file_url ? String(body.file_url) : undefined
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
