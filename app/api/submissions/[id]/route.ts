import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { deleteSubmission, getSubmissionById } from '@/lib/submission-repository';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeAuditLogs, runtimeSubmissionFileBlobs, runtimeSubmissionFiles } from '@/lib/runtime-store';
import { writeRuntimeAuditLogs, writeRuntimeSubmissionFiles } from '@/lib/runtime-persistence';

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const submission = await getSubmissionById(context.params.id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const isOwner =
      submission.author_id === user.id ||
      submission.submitter_email?.toLowerCase() === user.email.toLowerCase() ||
      submission.authors.toLowerCase().includes(user.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json({ error: 'Only the author can delete this submission' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('submission_files').delete().eq('submission_id', submission.id);
      await supabase.from('consent_logs').delete().eq('submission_id', submission.id);
      await supabase.from('submission_versions').delete().eq('submission_id', submission.id);
    }

    const toRemove = runtimeSubmissionFiles.filter((file) => file.submission_id === submission.id);
    if (toRemove.length > 0) {
      for (const file of toRemove) {
        runtimeSubmissionFileBlobs.delete(file.id);
      }
      const nextFiles = runtimeSubmissionFiles.filter((file) => file.submission_id !== submission.id);
      runtimeSubmissionFiles.length = 0;
      runtimeSubmissionFiles.push(...nextFiles);
      writeRuntimeSubmissionFiles(runtimeSubmissionFiles);
    }

    const removed = await deleteSubmission(submission.id);
    if (!removed) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const audit = {
      id: randomUUID(),
      submission_id: submission.id,
      action: 'author_deleted_submission',
      actor_email: user.email,
      detail: 'Author deleted submission for debugging',
      created_at: new Date().toISOString()
    };

    runtimeAuditLogs.push(audit);
    writeRuntimeAuditLogs(runtimeAuditLogs);

    if (supabase) {
      await supabase.from('audit_logs').insert(audit);
    }

    return NextResponse.json({ data: { id: submission.id, deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
