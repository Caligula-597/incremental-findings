import { NextResponse } from 'next/server';
import { JOURNAL_POSITIONING, JOURNAL_PUBLIC_PROGRAMS } from '@/lib/journal-plan';
import { listSubmissions } from '@/lib/submission-repository';

export async function GET() {
  try {
    const [published, pending, underReview] = await Promise.all([
      listSubmissions('published'),
      listSubmissions('pending'),
      listSubmissions('under_review')
    ]);

    const withDoi = published.filter((item) => Boolean(item.doi)).length;

    return NextResponse.json({
      data: {
        positioning: JOURNAL_POSITIONING,
        programs: JOURNAL_PUBLIC_PROGRAMS,
        live_metrics: {
          published_count: published.length,
          pending_count: pending.length,
          under_review_count: underReview.length,
          doi_coverage_ratio: published.length > 0 ? Number((withDoi / published.length).toFixed(3)) : 0
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
