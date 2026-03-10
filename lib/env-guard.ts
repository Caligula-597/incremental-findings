let hasLoggedProdWarning = false;

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build';
}

export function getProductionEnvRequirements() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = {
    sessionSecret: !process.env.SESSION_SECRET,
    editorAccessCode: !process.env.EDITOR_ACCESS_CODE,
    supabaseUrl: !(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRoleKey: !process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  return {
    isProd,
    missing,
    hasBlockingMissing: Object.values(missing).some(Boolean),
    isBuildPhase: isBuildPhase()
  };
}

export function enforceProductionEnvRequirements() {
  const status = getProductionEnvRequirements();

  // During build/prerender we should never hard-fail the bundle output;
  // we only enforce fail-fast at runtime request handling.
  if (!status.isProd || !status.hasBlockingMissing || status.isBuildPhase) {
    return status;
  }

  const missingKeys = Object.entries(status.missing)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');

  throw new Error(`Missing required production configuration: ${missingKeys}`);
}

export function maybeWarnForProductionEnv() {
  const status = getProductionEnvRequirements();
  if (!status.isProd || !status.hasBlockingMissing || hasLoggedProdWarning) {
    return status;
  }

  const missingKeys = Object.entries(status.missing)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');

  hasLoggedProdWarning = true;
  const phase = status.isBuildPhase ? 'build' : 'runtime';
  console.error(`[config:${phase}] Missing required production configuration: ${missingKeys}`);
  return status;
}
