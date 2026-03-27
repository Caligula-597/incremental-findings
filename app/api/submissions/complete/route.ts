import { createHash, randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { TERMS_VERSION } from '@/lib/legal';
import { runtimeAuditLogs, runtimeSubmissionFileBlobs, runtimeSubmissionFiles } from '@/lib/runtime-store';
import { getRuntimeStorageDir, writeRuntimeAuditLogs, writeRuntimeSubmissionFiles } from '@/lib/runtime-persistence';
import { createSubmission } from '@/lib/submission-repository';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSessionUser } from '@/lib/session';
import { isSubmissionTrack } from '@/lib/submission-track';

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



async function digestFileSha256(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return createHash('sha256').update(bytes).digest('hex');
}

async function uploadToStorage(file: File, pathPrefix: string) {
  const supabase = getSupabaseServerClient();
  const filePath = `${pathPrefix}/${Date.now()}-${file.name}`;

  if (!supabase) {
    const storageRoot = join(getRuntimeStorageDir(), 'files');
    const diskPath = join(storageRoot, filePath);
    mkdirSync(join(storageRoot, pathPrefix), { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    writeFileSync(diskPath, bytes);
    return { path: `local://${filePath}`, mode: 'memory' as const };
  }

  const arrayBuffer = await file.arrayBuffer();
  const upload = await supabase.storage.from('papers').upload(filePath, Buffer.from(arrayBuffer), {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });

  if (upload.error) {
    const storageRoot = join(getRuntimeStorageDir(), 'files');
    const diskPath = join(storageRoot, filePath);
    mkdirSync(join(storageRoot, pathPrefix), { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    writeFileSync(diskPath, bytes);
    return { path: `local://${filePath}`, mode: 'memory' as const, warning: upload.error.message };
  }

  return { path: `supabase://papers/${filePath}`, mode: 'supabase' as const };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const sessionUser = await getServerSessionUser();
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
    const submissionTrackValue = String(form.get('submission_track') ?? 'academic').trim();
    const campaignTheme = String(form.get('campaign_theme') ?? '').trim();
    const allAuthorsAuthorized = form.get('all_authors_authorized') === 'true';
    const authorSignature = String(form.get('author_signature') ?? '').trim();
    const coauthorSignaturesRaw = String(form.get('coauthor_signatures') ?? '').trim();

    if (!isSubmissionTrack(submissionTrackValue)) {
      return NextResponse.json({ error: 'submission_track must be academic or entertainment' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!allAuthorsAuthorized) {
      return NextResponse.json({ error: 'All authors authorization checkbox is required' }, { status: 400 });
    }

    if (!authorSignature) {
      return NextResponse.json({ error: 'Submitting author electronic signature is required' }, { status: 400 });
    }

    const authorsList = authors
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const coauthorSignatures = coauthorSignaturesRaw
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (authorsList.length > 1 && coauthorSignatures.length < authorsList.length - 1) {
      return NextResponse.json(
        {
          error: `Co-author signatures are required for all non-submitting authors. Expected at least ${authorsList.length - 1} signature lines.`
        },
        { status: 400 }
      );
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
    const storageDiagnostics: Array<{
      file_name: string;
      file_kind: 'manuscript' | 'cover_letter' | 'supporting';
      storage_mode: 'memory' | 'supabase';
      storage_path: string;
      warning?: string;
    }> = [];

    const manuscriptUpload = await uploadToStorage(manuscript, 'manuscripts');
    if (manuscriptUpload.warning) warnings.push(`Manuscript storage fallback: ${manuscriptUpload.warning}`);
    storageDiagnostics.push({
      file_name: manuscript.name,
      file_kind: 'manuscript',
      storage_mode: manuscriptUpload.mode,
      storage_path: manuscriptUpload.path,
      ...(manuscriptUpload.warning ? { warning: manuscriptUpload.warning } : {})
    });

    const created = await createSubmission({
      title,
      authors: authors || userEmail || (userId ? `Author ${userId.slice(0, 8)}` : 'Unknown author'),
      abstract: String(form.get('abstract') ?? ''),
      discipline: String(form.get('discipline') ?? ''),
      category: submissionTrackValue,
      topic: String(form.get('topic') ?? ''),
      article_type: String(form.get('article_type') ?? ''),
      file_url: manuscriptUpload.path,
      author_id: userId || undefined,
      submitter_email: userEmail
    });

    const filesToRecord: Array<{ file: File; kind: 'manuscript' | 'cover_letter' | 'supporting'; path: string; mode: 'memory' | 'supabase' }> = [
      { file: manuscript, kind: 'manuscript', path: manuscriptUpload.path, mode: manuscriptUpload.mode }
    ];

    const coverUpload = await uploadToStorage(coverLetter, 'cover-letters');
    if (coverUpload.warning) warnings.push(`Cover letter storage fallback: ${coverUpload.warning}`);
    storageDiagnostics.push({
      file_name: coverLetter.name,
      file_kind: 'cover_letter',
      storage_mode: coverUpload.mode,
      storage_path: coverUpload.path,
      ...(coverUpload.warning ? { warning: coverUpload.warning } : {})
    });
    filesToRecord.push({ file: coverLetter, kind: 'cover_letter', path: coverUpload.path, mode: coverUpload.mode });

    for (const item of supporting) {
      if (item instanceof File && item.size > 0) {
        const supportValidation = validateUploadedFile(item, 'supporting');
        if (supportValidation) {
          warnings.push(`${item.name}: ${supportValidation}`);
          continue;
        }

        const supportUpload = await uploadToStorage(item, 'supporting-files');
        if (supportUpload.warning) warnings.push(`Supporting file fallback (${item.name}): ${supportUpload.warning}`);
        storageDiagnostics.push({
          file_name: item.name,
          file_kind: 'supporting',
          storage_mode: supportUpload.mode,
          storage_path: supportUpload.path,
          ...(supportUpload.warning ? { warning: supportUpload.warning } : {})
        });
        filesToRecord.push({ file: item, kind: 'supporting', path: supportUpload.path, mode: supportUpload.mode });
      }
    }

    const now = new Date().toISOString();
    const fileIntegrity = await Promise.all(
      filesToRecord.map(async (entry) => ({
        file_name: entry.file.name,
        file_kind: entry.kind,
        sha256: await digestFileSha256(entry.file)
      }))
    );

    const fileRowsWithSource = filesToRecord.map((entry) => {
      const id = randomUUID();
      return {
        row: {
          id,
          submission_id: created.id,
          file_kind: entry.kind,
          file_name: entry.file.name,
          file_path: entry.path,
          content_type: entry.file.type || 'application/octet-stream',
          size_bytes: entry.file.size,
          created_at: now
        },
        entry
      };
    });

    const fileRows = fileRowsWithSource.map((item) => item.row);
    runtimeSubmissionFiles.push(...fileRows);
    writeRuntimeSubmissionFiles(runtimeSubmissionFiles);

    for (const item of fileRowsWithSource) {
      if (item.entry.mode === 'memory') {
        const bytes = Buffer.from(await item.entry.file.arrayBuffer());
        runtimeSubmissionFileBlobs.set(item.row.id, {
          file_name: item.row.file_name,
          content_type: item.row.content_type,
          bytes
        });
      }
    }

    const metadataPayload: Record<string, unknown> = {
      title,
      authors: authors || userEmail || (userId ? `Author ${userId.slice(0, 8)}` : 'Unknown author'),
      abstract: String(form.get('abstract') ?? ''),
      discipline: String(form.get('discipline') ?? ''),
      category: submissionTrackValue,
      topic: String(form.get('topic') ?? ''),
      article_type: String(form.get('article_type') ?? ''),
      signatures: {
        all_authors_authorized: allAuthorsAuthorized,
        submitting_author_signature: authorSignature,
        coauthor_signatures: coauthorSignatures
      }
    };
    if (campaignTheme) {
      metadataPayload.campaign_theme = campaignTheme;
    }

    const audit = {
      id: randomUUID(),
      submission_id: created.id,
      action: 'submission_created',
      actor_email: userEmail,
      detail: `Submission created with ${fileRows.length} files and terms ${consent.terms_version}; meta_b64=${Buffer.from(JSON.stringify(metadataPayload), 'utf8').toString('base64url')}; integrity=${fileIntegrity.map((item) => `${item.file_name}:${item.sha256.slice(0, 12)}`).join(',')}`,
      created_at: now
    };
    runtimeAuditLogs.push(audit);
    writeRuntimeAuditLogs(runtimeAuditLogs);

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
          campaign_theme: campaignTheme || null,
          signatures: {
            all_authors_authorized: allAuthorsAuthorized,
            submitting_author_signature: authorSignature,
            coauthor_signature_count: coauthorSignatures.length
          },
          consent,
          files: fileRows,
          file_integrity: fileIntegrity,
          audit,
          storage_diagnostics: storageDiagnostics
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
