import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { isManagingEditor } from '@/lib/editor-workspace-service';
import { listEditorApplications, submitEditorApplication } from '@/lib/editor-access';

export async function GET(request: Request) {
  const user = await getServerSessionUser();
  if (!user || user.role !== 'editor') {
    return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
  }
  if (!isManagingEditor(user)) {
    return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'pending' | 'under_review' | 'approved' | 'rejected' | null;
  const data = await listEditorApplications(status ?? undefined);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const statement = String(body.statement ?? '').trim();
  if (!statement || statement.length < 20) {
    return NextResponse.json({ error: 'Please provide a detailed application statement (min 20 chars).' }, { status: 400 });
  }

  const submitted = await submitEditorApplication({
    applicant_email: user.email,
    applicant_name: user.name,
    statement
  });

  return NextResponse.json(
    {
      data: submitted.data,
      mode: submitted.mode,
      reused: submitted.reused
    },
    { status: submitted.reused ? 200 : 201 }
  );
}
