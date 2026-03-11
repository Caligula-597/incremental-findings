import { NextResponse } from 'next/server';
import { getRuntimeModeSnapshot } from '@/lib/runtime-mode';

export async function GET() {
  const snapshot = getRuntimeModeSnapshot();

  const guidance = snapshot.mode === 'supabase'
    ? 'Supabase server mode is active. Keep service role key restricted to backend-only execution contexts.'
    : 'Memory fallback is active. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable persistent storage.';

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    runtime: snapshot,
    guidance,
    productionGate:
      snapshot.isProduction && !snapshot.productionReady
        ? 'Production mode has missing required configuration. Server integrations may degrade to fallback behavior and emit warnings.'
        : 'Production configuration gate is satisfied or not active (non-production).'
  });
}
