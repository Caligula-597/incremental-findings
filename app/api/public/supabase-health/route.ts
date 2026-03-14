import { NextResponse } from 'next/server';
import { getRuntimeModeSnapshot } from '@/lib/runtime-mode';

export async function GET() {
  const snapshot = getRuntimeModeSnapshot();

  const guidance = snapshot.mode === 'supabase'
    ? 'Supabase server mode is active. Keep service role key restricted to backend-only execution contexts.'
    : 'Memory fallback is active. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable persistent storage.';

  const backendMatchChecklist = [
    snapshot.supabaseUrlConfigured ? null : 'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is missing',
    snapshot.serviceRoleConfigured ? null : 'SUPABASE_SERVICE_ROLE_KEY is missing',
    snapshot.requireSupabase && snapshot.mode !== 'supabase' ? 'REQUIRE_SUPABASE=true is set but runtime is not in supabase mode' : null
  ].filter(Boolean);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    runtime: snapshot,
    guidance,
    backendMatchChecklist,
    productionGate:
      snapshot.isProduction && !snapshot.productionReady
        ? 'Production mode has missing required configuration. Server integrations may degrade to fallback behavior and emit warnings.'
        : 'Production configuration gate is satisfied or not active (non-production).'
  });
}
