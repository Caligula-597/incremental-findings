import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeOrcidLinks } from '@/lib/runtime-store';
import { buildOrcidEnvDiagnostics, buildOrcidRuntimeChecks } from '@/lib/orcid-debug';

function getAccountRedirectUrl(request: NextRequest, status: 'success' | 'error', details?: string) {
  const accountUrl = new URL('/account', request.url);
  accountUrl.searchParams.set('orcid', status);
  if (details) {
    accountUrl.searchParams.set('message', details.slice(0, 200));
  }
  return accountUrl;
}

function shouldReturnJson(request: NextRequest) {
  return request.nextUrl.searchParams.get('format') === 'json';
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const jsonMode = shouldReturnJson(request);

  if (!code || !state) {
    if (!jsonMode) {
      return NextResponse.redirect(getAccountRedirectUrl(request, 'error', 'Missing ORCID callback parameters'));
    }
    return NextResponse.json({ error: 'Missing ORCID callback parameters' }, { status: 400 });
  }

  const tokenEndpoint = 'https://orcid.org/oauth/token';
  const clientId = process.env.ORCID_CLIENT_ID;
  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  const redirectUri = process.env.ORCID_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    if (!jsonMode) {
      return NextResponse.redirect(getAccountRedirectUrl(request, 'error', 'ORCID credentials are not configured on server'));
    }
    return NextResponse.json(
      {
        error:
          'ORCID callback received, but token exchange skipped because ORCID_CLIENT_ID/ORCID_CLIENT_SECRET/ORCID_REDIRECT_URI are not fully configured.'
      },
      { status: 501 }
    );
  }

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  const tokenRes = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    if (!jsonMode) {
      return NextResponse.redirect(getAccountRedirectUrl(request, 'error', 'ORCID token exchange failed'));
    }
    return NextResponse.json(
      {
        error: `ORCID token exchange failed: ${text}`,
        diagnostics: {
          env: buildOrcidEnvDiagnostics(),
          runtime: buildOrcidRuntimeChecks(request.url)
        }
      },
      { status: 502 }
    );
  }

  const tokenData = (await tokenRes.json()) as { orcid?: string };
  const orcidId = tokenData.orcid;
  const [emailFromState] = Buffer.from(state, 'base64url').toString('utf8').split('|');

  if (!orcidId || !emailFromState) {
    if (!jsonMode) {
      return NextResponse.redirect(getAccountRedirectUrl(request, 'error', 'Could not resolve ORCID identity'));
    }
    return NextResponse.json({ error: 'Could not resolve ORCID id or email from callback' }, { status: 400 });
  }

  const record = {
    user_email: emailFromState.toLowerCase(),
    orcid_id: orcidId,
    verified: true,
    connected_at: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const insert = await supabase.from('orcid_links').upsert(record, { onConflict: 'user_email' });
    if (insert.error) {
      runtimeOrcidLinks.push(record);
      if (!jsonMode) {
        return NextResponse.redirect(getAccountRedirectUrl(request, 'success', 'ORCID linked in fallback memory mode'));
      }
      return NextResponse.json({ data: record, mode: 'memory-fallback', warning: insert.error.message });
    }
    if (!jsonMode) {
      return NextResponse.redirect(getAccountRedirectUrl(request, 'success'));
    }
    return NextResponse.json({ data: record, mode: 'supabase' });
  }

  const existing = runtimeOrcidLinks.find((item) => item.user_email === record.user_email);
  if (existing) {
    existing.orcid_id = record.orcid_id;
    existing.verified = true;
    existing.connected_at = record.connected_at;
  } else {
    runtimeOrcidLinks.push(record);
  }

  if (!jsonMode) {
    return NextResponse.redirect(getAccountRedirectUrl(request, 'success', 'ORCID linked in memory mode'));
  }

  return NextResponse.json({ data: record, mode: 'memory' });
}
