import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    likelyCauses: [
      'Next.js dev mode compiles routes on first visit, causing temporary lag.',
      'Cold Supabase or storage calls can increase first-response time.',
      'Client session fetch in header may delay identity badge update under weak network.'
    ],
    mitigations: [
      'Use `npm run build && npm run start` to measure production-like performance.',
      'Pre-warm high-traffic pages (`/`, `/community`, `/submit`) after deployment.',
      'Monitor API latency and add route-level caching where auth is not required.'
    ]
  });
}
