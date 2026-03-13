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

// Soft guard: never throw from shared helpers to avoid taking down unrelated pages/routes.
// Callers can decide whether to reject writes explicitly; shared read/diagnostic paths should degrade gracefully.
export function enforceProductionEnvRequirements() {
  return getProductionEnvRequirements();
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
