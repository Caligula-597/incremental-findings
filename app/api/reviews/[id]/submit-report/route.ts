import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { submitReviewReport } from '@/lib/review-service';

const allowed = new Set(['accept', 'minor_revision', 'major_revision', 'reject']);

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const recommendation = String(body?.recommendation ?? '').trim().toLowerCase();
    const summary = String(body?.summary ?? '').trim();
    const confidentialNote = String(body?.confidential_note ?? '').trim();

    if (!allowed.has(recommendation)) {
      return NextResponse.json({ error: 'Invalid recommendation' }, { status: 400 });
    }
    if (!summary) {
      return NextResponse.json({ error: 'summary is required' }, { status: 400 });
    }

    const report = await submitReviewReport({
      assignmentId: context.params.id,
      reviewerEmail: sessionUser.email,
      recommendation: recommendation as 'accept' | 'minor_revision' | 'major_revision' | 'reject',
      summary,
      confidentialNote: confidentialNote || undefined
    });

    if (!report) {
      return NextResponse.json({ error: 'Assignment not found or not permitted' }, { status: 404 });
    }

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
