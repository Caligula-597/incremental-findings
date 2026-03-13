import { NextResponse } from 'next/server';
import { FEATURE_ROADMAP, getRoadmapSummary } from '@/lib/feature-roadmap';

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: getRoadmapSummary(),
    modules: FEATURE_ROADMAP
  });
}
