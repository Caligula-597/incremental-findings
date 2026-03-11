import { NextResponse } from 'next/server';
import { COMPLETED_FOUNDATION_ITEMS, FEATURE_ROADMAP } from '@/lib/feature-roadmap';

const implementedApiChecklist = [
  '/api/notifications/templates',
  '/api/submissions/:id/revisions',
  '/api/reviews/assign',
  '/api/production/:id/start',
  '/api/security/risk-check',
  '/api/indexing/export/:provider'
];

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    completedModules: COMPLETED_FOUNDATION_ITEMS,
    remainingModules: FEATURE_ROADMAP,
    implementedApiChecklist,
    summary: {
      completedCount: COMPLETED_FOUNDATION_ITEMS.length,
      remainingCount: FEATURE_ROADMAP.length
    }
  });
}
