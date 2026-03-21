import { NextResponse } from 'next/server';
import { JOURNAL_POSITIONING, JOURNAL_PUBLIC_PROGRAMS } from '@/lib/journal-plan';
import { listSubmissions } from '@/lib/submission-repository';

export async function GET() {
  try {
    const [published, underReview, accepted, inProduction, rejected] = await Promise.all([
      listSubmissions('published'),
      listSubmissions('under_review'),
      listSubmissions('accepted'),
      listSubmissions('in_production'),
      listSubmissions('rejected')
    ]);

    const withDoi = published.filter((item) => Boolean(item.doi)).length;

    return NextResponse.json({
      data: {
        positioning: JOURNAL_POSITIONING,
        programs: JOURNAL_PUBLIC_PROGRAMS,
        live_metrics: {
          published_count: published.length,
          under_review_count: underReview.length,
          accepted_count: accepted.length,
          in_production_count: inProduction.length,
          rejected_count: rejected.length,
          doi_coverage_ratio: published.length > 0 ? Number((withDoi / published.length).toFixed(3)) : 0
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
