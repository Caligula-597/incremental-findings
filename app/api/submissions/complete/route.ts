import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { TERMS_VERSION } from '@/lib/legal';
import { runtimeAuditLogs, runtimeSubmissionFiles } from '@/lib/runtime-store';
import { createSubmission } from '@/lib/submission-repository';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSessionUser } from '@/lib/session';

const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;
const MAX_SUPPORTING_BYTES = 100 * 1024 * 1024;

function validateUploadedFile(file: File, kind: 'manuscript' | 'cover_letter' | 'supporting') {
  if (kind === 'manuscript' && file.type !== 'application/pdf') {
    return 'Manuscript must be a PDF file';
  }

  if ((kind === 'manuscript' || kind === 'cover_letter') && file.size > MAX_MANUSCRIPT_BYTES) {
    return `${kind} file exceeds 50MB limit`;
  }

  if (kind === 'supporting' && file.size > MAX_SUPPORTING_BYTES) {
    return 'Supporting file exceeds 100MB limit';
  }

  return null;
}


async function uploadToStorage(file: File, pathPrefix: string) {
  const supabase = getSupabaseServerClient();
  const filePath = `${pathPrefix}/${Date.now()}-${file.name}`;

  if (!supabase) {
    return { path: filePath, mode: 'memory' as const };
  }

  const arrayBuffer = await file.arrayBuffer();
  const upload = await supabase.storage.from('papers').upload(filePath, Buffer.from(arrayBuffer), {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });

  if (upload.error) {
    return { path: filePath, mode: 'memory' as const, warning: upload.error.message };
  }

  const publicUrl = supabase.storage.from('papers').getPublicUrl(filePath).data.publicUrl;
  return { path: publicUrl || filePath, mode: 'supabase' as const };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Login required before submission' }, { status: 401 });
    }

    const userEmailInput = String(form.get('user_email') ?? '').trim().toLowerCase();
    const userIdInput = String(form.get('user_id') ?? '').trim();
    const userEmail = userEmailInput || sessionUser.email;
    const userId = userIdInput || sessionUser.id;
    if (userEmail !== sessionUser.email || userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Submission identity does not match active session' }, { status: 403 });
    }

    const title = String(form.get('title') ?? '').trim();
    const authors = String(form.get('authors') ?? '').trim();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const consent = {
      author_warranty: form.get('author_warranty') === 'true',
      originality_warranty: form.get('originality_warranty') === 'true',
      ethics_warranty: form.get('ethics_warranty') === 'true',
      privacy_ack: form.get('privacy_ack') === 'true',
      terms_version: String(form.get('terms_version') ?? TERMS_VERSION)
    };

    if (!consent.author_warranty || !consent.originality_warranty || !consent.ethics_warranty || !consent.privacy_ack) {
      return NextResponse.json({ error: 'All author agreements must be accepted before submission' }, { status: 400 });
    }

    const manuscript = form.get('manuscript');
    const coverLetter = form.get('cover_letter');
    const supporting = form.getAll('supporting_files');

    if (!(manuscript instanceof File) || manuscript.size === 0) {
      return NextResponse.json({ error: 'Manuscript PDF is required' }, { status: 400 });
    }

    if (!(coverLetter instanceof File) || coverLetter.size === 0) {
      return NextResponse.json({ error: 'Cover letter is required' }, { status: 400 });
    }

    const manuscriptValidation = validateUploadedFile(manuscript, 'manuscript');
    if (manuscriptValidation) {
      return NextResponse.json({ error: manuscriptValidation }, { status: 400 });
    }

    const coverValidation = validateUploadedFile(coverLetter, 'cover_letter');
    if (coverValidation) {
      return NextResponse.json({ error: coverValidation }, { status: 400 });
    }

    const warnings: string[] = [];

    const manuscriptUpload = await uploadToStorage(manuscript, 'manuscripts');
    if (manuscriptUpload.warning) warnings.push(`Manuscript storage fallback: ${manuscriptUpload.warning}`);

    const created = await createSubmission({
      title,
      authors: authors || userEmail || (userId ? `Author ${userId.slice(0, 8)}` : 'Unknown author'),
      abstract: String(form.get('abstract') ?? ''),
      discipline: String(form.get('discipline') ?? ''),
      category: String(form.get('discipline') ?? ''),
      topic: String(form.get('topic') ?? ''),
      article_type: String(form.get('article_type') ?? ''),
      file_url: manuscriptUpload.path,
      author_id: userId || undefined
    });

    const filesToRecord: Array<{ file: File; kind: 'manuscript' | 'cover_letter' | 'supporting'; path: string }> = [
      { file: manuscript, kind: 'manuscript', path: manuscriptUpload.path }
    ];

    const coverUpload = await uploadToStorage(coverLetter, 'cover-letters');
    if (coverUpload.warning) warnings.push(`Cover letter storage fallback: ${coverUpload.warning}`);
    filesToRecord.push({ file: coverLetter, kind: 'cover_letter', path: coverUpload.path });

    for (const item of supporting) {
      if (item instanceof File && item.size > 0) {
        const supportValidation = validateUploadedFile(item, 'supporting');
        if (supportValidation) {
          warnings.push(`${item.name}: ${supportValidation}`);
          continue;
        }

        const supportUpload = await uploadToStorage(item, 'supporting-files');
        if (supportUpload.warning) warnings.push(`Supporting file fallback (${item.name}): ${supportUpload.warning}`);
        filesToRecord.push({ file: item, kind: 'supporting', path: supportUpload.path });
      }
    }

    const now = new Date().toISOString();
    const fileRows = filesToRecord.map((entry) => ({
      id: randomUUID(),
      submission_id: created.id,
      file_kind: entry.kind,
      file_name: entry.file.name,
      file_path: entry.path,
      content_type: entry.file.type || 'application/octet-stream',
      size_bytes: entry.file.size,
      created_at: now
    }));

    runtimeSubmissionFiles.push(...fileRows);

    const audit = {
      id: randomUUID(),
      submission_id: created.id,
      action: 'submission_created',
      actor_email: userEmail,
      detail: `Submission created with ${fileRows.length} files and terms ${consent.terms_version}`,
      created_at: now
    };
    runtimeAuditLogs.push(audit);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const fileInsert = await supabase.from('submission_files').insert(fileRows);
      if (fileInsert.error) warnings.push(`submission_files insert skipped: ${fileInsert.error.message}`);

      const consentInsert = await supabase.from('consent_logs').insert({
        submission_id: created.id,
        user_email: userEmail,
        ...consent,
        consented_at: now,
        ip_hash: 'not-captured-in-mvp'
      });
      if (consentInsert.error) warnings.push(`consent_logs insert skipped: ${consentInsert.error.message}`);

      const auditInsert = await supabase.from('audit_logs').insert(audit);
      if (auditInsert.error) warnings.push(`audit_logs insert skipped: ${auditInsert.error.message}`);
    }

    return NextResponse.json(
      {
        data: {
          submission: created,
          consent,
          files: fileRows,
          audit
        },
        warnings
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
