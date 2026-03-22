import { NextResponse } from 'next/server';
import { getBackendRecommendationSnapshot } from '@/lib/backend-recommendation';

export const revalidate = 60;

export async function GET() {
  return NextResponse.json({
    data: getBackendRecommendationSnapshot()
  });
}
