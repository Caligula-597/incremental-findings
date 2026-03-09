export type RuntimeMode = 'supabase' | 'memory';

export function getRuntimeModeSnapshot() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const mode: RuntimeMode = supabaseUrl && serviceRoleConfigured ? 'supabase' : 'memory';

  return {
    mode,
    supabaseUrlConfigured: Boolean(supabaseUrl),
    serviceRoleConfigured,
    publicAnonConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    publicUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
    editorAccessCodeConfigured: Boolean(process.env.EDITOR_ACCESS_CODE),
    orcidConfigured: Boolean(process.env.ORCID_CLIENT_ID && process.env.ORCID_CLIENT_SECRET)
  };
}
