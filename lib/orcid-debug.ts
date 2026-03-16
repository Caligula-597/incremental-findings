import { createHash } from 'crypto';

function fingerprint(value: string | undefined) {
  if (!value) return null;
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function buildOrcidEnvDiagnostics() {
  const clientId = process.env.ORCID_CLIENT_ID;
  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  const redirectUri = process.env.ORCID_REDIRECT_URI;

  return {
    client_id_present: Boolean(clientId),
    client_secret_present: Boolean(clientSecret),
    redirect_uri_present: Boolean(redirectUri),
    client_id_prefix: clientId ? clientId.slice(0, 8) : null,
    client_id_fingerprint: fingerprint(clientId),
    client_secret_length: clientSecret ? clientSecret.length : 0,
    client_secret_fingerprint: fingerprint(clientSecret),
    redirect_uri: redirectUri ?? null,
    notes: [
      'Fingerprints are one-way hashes and do not reveal secret values.',
      'If your Vercel env and local env fingerprints differ, deployment env is misconfigured.'
    ]
  };
}

export function buildOrcidRuntimeChecks(requestUrl: string) {
  const url = new URL(requestUrl);
  const expectedCallback = `${url.protocol}//${url.host}/api/orcid/callback`;
  const configuredCallback = process.env.ORCID_REDIRECT_URI ?? null;

  return {
    expected_callback_from_request: expectedCallback,
    configured_callback: configuredCallback,
    callback_matches_request_host: configuredCallback === expectedCallback,
    production_requires_https_ok: !url.hostname.includes('localhost') ? url.protocol === 'https:' : true
  };
}
