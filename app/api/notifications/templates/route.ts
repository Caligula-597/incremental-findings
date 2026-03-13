import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listNotificationTemplates } from '@/lib/notification-service';

export async function GET() {
  const sessionUser = getServerSessionUser();
  if (!sessionUser || sessionUser.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }

  return NextResponse.json({ data: listNotificationTemplates() });
}
