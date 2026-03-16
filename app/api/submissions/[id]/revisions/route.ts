import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { createSubmissionVersion, listSubmissionVersions } from '@/lib/submission-version-service';
import { getSubmissionById } from '@/lib/submission-repository';
import { runtimeAuditLogs } from '@/lib/runtime-store';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (sessionUser.role !== 'editor' && submission.author_id && submission.author_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await listSubmissionVersions(context.params.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (sessionUser.role !== 'editor' && submission.author_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Only the author or editor can create revisions' }, { status: 403 });
    }

    const body = await request.json();
    const revisionSummary = String(body?.revision_summary ?? '').trim();
    const fileUrl = body?.file_url ? String(body.file_url).trim() : null;
    const metadata = typeof body?.metadata === 'object' && body?.metadata ? body.metadata : undefined;

    if (!revisionSummary) {
      return NextResponse.json({ error: 'revision_summary is required' }, { status: 400 });
    }

    const version = await createSubmissionVersion({
      submission,
      actorEmail: sessionUser.email,
      revisionSummary,
      fileUrl,
      metadata
    });

    const now = new Date().toISOString();
    const audit = {
      id: randomUUID(),
      submission_id: submission.id,
      action: 'revision_created',
      actor_email: sessionUser.email,
      detail: `Version v${version.version_index} created`,
      created_at: now
    };

    runtimeAuditLogs.push(audit);
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('audit_logs').insert(audit);
    }

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
