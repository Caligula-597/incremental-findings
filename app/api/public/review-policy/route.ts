import { NextResponse } from 'next/server';
import { getReviewPolicyConfig } from '@/lib/review-policy';

export const revalidate = 60;

export async function GET() {
  return NextResponse.json({ data: getReviewPolicyConfig() });
}
