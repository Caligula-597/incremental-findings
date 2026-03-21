import { NextResponse } from 'next/server';
import { JOURNAL_STANDARDS, getJournalStandardsSummary } from '@/lib/journal-standards';

export const revalidate = 60;

export async function GET() {
  return NextResponse.json({
    data: {
      summary: getJournalStandardsSummary(),
      sections: JOURNAL_STANDARDS
    }
  });
}
