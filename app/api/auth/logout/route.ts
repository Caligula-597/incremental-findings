import { NextResponse } from 'next/server';
import { clearSessionCookie, revokeCurrentSession } from '@/lib/session';

export async function POST() {
  await revokeCurrentSession();
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
