import { NextResponse } from 'next/server';
import { publishSubmission } from '@/lib/submission-repository';
import { getServerSessionUser } from '@/lib/session';

export async function POST(_: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
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
