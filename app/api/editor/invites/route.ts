import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { isManagingEditor } from '@/lib/editor-workspace-service';
import { createEditorInvite, listEditorApplications } from '@/lib/editor-access';

export async function GET() {
  const user = await getServerSessionUser();
  if (!user || user.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }
  if (!isManagingEditor(user)) {
    return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
  }

  const pending = await listEditorApplications('pending');
  return NextResponse.json({ data: pending });
}

export async function POST(request: Request) {
  const user = await getServerSessionUser();
  if (!user || user.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }
  if (!isManagingEditor(user)) {
    return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const applicantEmail = String(body.applicant_email ?? '').trim().toLowerCase();
  const applicationId = String(body.application_id ?? '').trim();
  const expiresInDays = Number(body.expires_in_days ?? 7);

  if (!applicantEmail) {
    return NextResponse.json({ error: 'applicant_email is required' }, { status: 400 });
  }

  const invite = await createEditorInvite({
    applicant_email: applicantEmail,
    invited_by_email: user.email,
    application_id: applicationId || undefined,
    expires_in_days: expiresInDays
  });

  return NextResponse.json({ data: invite.data, mode: invite.mode }, { status: 201 });
}
