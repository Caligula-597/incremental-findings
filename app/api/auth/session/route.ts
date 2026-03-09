import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';

export async function GET() {
  const user = getServerSessionUser();
  if (!user) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  return NextResponse.json({ data: user });
}
