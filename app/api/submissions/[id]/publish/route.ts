import { NextResponse } from 'next/server';
import { publishSubmission } from '@/lib/submission-repository';

export async function POST(_: Request, context: { params: { id: string } }) {
  const updated = await publishSubmission(context.params.id);

  if (!updated) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
