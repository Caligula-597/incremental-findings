import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { respondReviewInvitation } from '@/lib/review-service';

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const response = String(body?.response ?? '').trim().toLowerCase();

    if (response !== 'accepted' && response !== 'declined') {
      return NextResponse.json({ error: 'response must be accepted or declined' }, { status: 400 });
    }

    const updated = await respondReviewInvitation({
      assignmentId: context.params.id,
      reviewerEmail: sessionUser.email,
      response: response as 'accepted' | 'declined'
    });

    if (!updated) {
      return NextResponse.json({ error: 'Invitation not found or not permitted' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
