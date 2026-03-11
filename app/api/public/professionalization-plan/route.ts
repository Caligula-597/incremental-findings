import { NextResponse } from 'next/server';
import { PROFESSIONALIZATION_PLAN, getProfessionalizationSummary } from '@/lib/professionalization-plan';

export const revalidate = 60;

export async function GET() {
  return NextResponse.json({
    data: {
      summary: getProfessionalizationSummary(),
      items: PROFESSIONALIZATION_PLAN
    }
  });
}
