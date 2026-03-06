import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeOrcidLinks } from '@/lib/runtime-store';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing ORCID callback parameters' }, { status: 400 });
  }

  const tokenEndpoint = 'https://orcid.org/oauth/token';
  const clientId = process.env.ORCID_CLIENT_ID;
  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  const redirectUri = process.env.ORCID_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
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
    return NextResponse.json({ error: `ORCID token exchange failed: ${text}` }, { status: 502 });
  }

  const tokenData = (await tokenRes.json()) as { orcid?: string };
  const orcidId = tokenData.orcid;
  const [emailFromState] = Buffer.from(state, 'base64url').toString('utf8').split('|');

  if (!orcidId || !emailFromState) {
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
      return NextResponse.json({ data: record, mode: 'memory-fallback', warning: insert.error.message });
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

  return NextResponse.json({ data: record, mode: 'memory' });
}
