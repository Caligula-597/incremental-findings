import { NextResponse } from 'next/server';
import { getIntegrationReadiness } from '@/lib/integration-plan';

export async function GET() {
  const readiness = getIntegrationReadiness();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      total: readiness.length,
      configured: readiness.filter((item) => item.configured).length,
      requiredMissing: readiness.filter((item) => item.required && !item.configured).length
    },
    providers: readiness
  });
}
