import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listNotificationJobs, NotificationTemplateKey, sendNotification } from '@/lib/notification-service';

export async function GET(request: Request) {
  const sessionUser = await getServerSessionUser();
  if (!sessionUser || sessionUser.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? '30');
  const limit = Number.isFinite(limitRaw) ? limitRaw : 30;

  return NextResponse.json({ data: listNotificationJobs(limit) });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const template = String(body?.template ?? '') as NotificationTemplateKey;
    const to = String(body?.to ?? '').trim().toLowerCase();
    const variables = typeof body?.variables === 'object' && body?.variables ? body.variables : {};

    if (!to || !to.includes('@')) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }

    const job = await sendNotification({
      template,
      to,
      variables,
      actorEmail: sessionUser.email
    });

    return NextResponse.json({ data: job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
