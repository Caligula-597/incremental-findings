import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.ORCID_CLIENT_ID;
  const redirectUri = process.env.ORCID_REDIRECT_URI;
  const scope = '/authenticate';
  const email = request.nextUrl.searchParams.get('email') ?? '';
  const userId = request.nextUrl.searchParams.get('user_id') ?? '';
  const forceAuth = request.nextUrl.searchParams.get('force') === 'true';

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'ORCID is not configured. Missing ORCID_CLIENT_ID or ORCID_REDIRECT_URI.' },
      { status: 501 }
    );
  }

  const state = Buffer.from(`${userId}|${email}|${Date.now()}`).toString('base64url');
  const authorizationUrl =
    `https://orcid.org/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}` +
    (forceAuth ? '&show_login=true' : '');

  return NextResponse.json({ data: { authorization_url: authorizationUrl, state, force_auth: forceAuth } });
}
