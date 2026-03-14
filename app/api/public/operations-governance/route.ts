import { NextResponse } from 'next/server';
import { getOperationsGovernanceSnapshot } from '@/lib/operations-governance';

export const revalidate = 60;

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    data: getOperationsGovernanceSnapshot()
  });
}
