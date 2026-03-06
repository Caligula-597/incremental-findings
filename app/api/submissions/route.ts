import { NextRequest, NextResponse } from 'next/server';
import { createSubmission, listSubmissions } from '@/lib/submission-repository';
import { SubmissionStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') as SubmissionStatus | null;
  const data = await listSubmissions(status ?? undefined);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.title || !body.journal || !body.category || !body.review) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const created = await createSubmission({
    title: body.title,
    journal: body.journal,
    category: body.category,
    review: body.review,
    fileUrl: body.fileUrl || '#'
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
