let hasLoggedProdWarning = false;

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
    hasBlockingMissing: Object.values(missing).some(Boolean)
  };
}

export function enforceProductionEnvRequirements() {
  const status = getProductionEnvRequirements();

  if (!status.isProd || !status.hasBlockingMissing) {
    return status;
  }

  const missingKeys = Object.entries(status.missing)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');

  if (!hasLoggedProdWarning) {
    hasLoggedProdWarning = true;
    throw new Error(`Missing required production configuration: ${missingKeys}`);
  }

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
  console.error(`[config] Missing required production configuration: ${missingKeys}`);
  return status;
}
