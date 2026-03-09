import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { assignSubmissionDoi, getSubmissionById } from '@/lib/submission-repository';
import { getServerSessionUser } from '@/lib/session';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeAuditLogs } from '@/lib/runtime-store';
import { buildDoiForSubmission } from '@/lib/doi';

export async function POST(_: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'published') {
      return NextResponse.json({ error: 'DOI can only be assigned after publication' }, { status: 409 });
    }

    if (submission.doi) {
      return NextResponse.json({
        data: {
          submission_id: submission.id,
          doi: submission.doi,
          registered_at: submission.doi_registered_at,
          provider: 'mock'
        },
        warning: 'DOI already exists; returned existing value.'
      });
    }

    const registration = buildDoiForSubmission(submission);
    const updated = await assignSubmissionDoi(submission.id, registration.doi, registration.registered_at);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to assign DOI to submission' }, { status: 500 });
    }

    const audit = {
      id: randomUUID(),
      submission_id: submission.id,
      action: 'doi_assigned',
      actor_email: sessionUser.email,
      detail: `Assigned DOI ${registration.doi}`,
      created_at: registration.registered_at
    };

    runtimeAuditLogs.push(audit);
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const auditInsert = await supabase.from('audit_logs').insert(audit);
      if (auditInsert.error) {
        return NextResponse.json({ data: registration, warning: `Audit log insert failed: ${auditInsert.error.message}` });
      }
    }

    return NextResponse.json({ data: registration });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
