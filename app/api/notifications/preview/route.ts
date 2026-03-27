import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { previewNotification, NotificationTemplateKey } from '@/lib/notification-service';

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const template = String(body?.template ?? '') as NotificationTemplateKey;
    const variables = typeof body?.variables === 'object' && body?.variables ? body.variables : {};

    const preview = previewNotification(template, variables);
    return NextResponse.json({ data: preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
