import { NextRequest, NextResponse } from 'next/server';
import { buildOrcidEnvDiagnostics, buildOrcidRuntimeChecks } from '@/lib/orcid-debug';

export async function GET(request: NextRequest) {
  const env = buildOrcidEnvDiagnostics();
  const runtime = buildOrcidRuntimeChecks(request.url);

  const authorization_url_preview = env.client_id_present && env.redirect_uri
    ? `https://orcid.org/oauth/authorize?client_id=${encodeURIComponent(process.env.ORCID_CLIENT_ID ?? '')}&response_type=code&scope=%2Fauthenticate&redirect_uri=${encodeURIComponent(env.redirect_uri)}`
    : null;

  return NextResponse.json({
    data: {
      env,
      runtime,
      authorization_url_preview,
      troubleshooting: [
        'invalid_client usually means ORCID_CLIENT_ID / ORCID_CLIENT_SECRET mismatch.',
        'If callback_matches_request_host is false, your ORCID_REDIRECT_URI likely mismatches deployment domain.',
        'After changing Vercel env vars, redeploy the app to ensure new values are loaded.'
      ]
    }
  });
}
