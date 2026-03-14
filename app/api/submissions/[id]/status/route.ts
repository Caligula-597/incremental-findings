import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/submission-repository';
import { SubmissionStatus } from '@/lib/types';
import { getServerSessionUser } from '@/lib/session';
import { canTransitionStatus, requiresDecisionReason } from '@/lib/workflow';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getRuntimeStorageDir, writeRuntimeAuditLogs, writeRuntimeSubmissionFiles } from '@/lib/runtime-persistence';
import { runtimeAuditLogs, runtimeSubmissionFileBlobs, runtimeSubmissionFiles } from '@/lib/runtime-store';

const allowedStatus = new Set<SubmissionStatus>(['pending', 'under_review', 'published', 'rejected']);

async function uploadEditorResponseFile(file: File) {
  const supabase = getSupabaseServerClient();
  const filePath = `editor-responses/${Date.now()}-${file.name}`;

  if (!supabase) {
    const storageRoot = join(getRuntimeStorageDir(), 'files');
    mkdirSync(join(storageRoot, 'editor-responses'), { recursive: true });
    const diskPath = join(storageRoot, filePath);
    const bytes = Buffer.from(await file.arrayBuffer());
    writeFileSync(diskPath, bytes);
    return { path: `local://${filePath}`, mode: 'memory' as const };
  }

  const upload = await supabase.storage.from('papers').upload(filePath, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });

  if (upload.error) {
    const storageRoot = join(getRuntimeStorageDir(), 'files');
    mkdirSync(join(storageRoot, 'editor-responses'), { recursive: true });
    const diskPath = join(storageRoot, filePath);
    const bytes = Buffer.from(await file.arrayBuffer());
    writeFileSync(diskPath, bytes);
    return { path: `local://${filePath}`, mode: 'memory' as const, warning: upload.error.message };
  }

  return { path: `supabase://papers/${filePath}`, mode: 'supabase' as const };
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    let nextStatus: SubmissionStatus | undefined;
    let decisionReason = '';
    let responseLetter = '';
    let responseFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      nextStatus = String(form.get('status') ?? '').trim() as SubmissionStatus;
      decisionReason = String(form.get('reason') ?? '').trim();
      responseLetter = String(form.get('response_letter') ?? '').trim();
      const file = form.get('response_file');
      responseFile = file instanceof File && file.size > 0 ? file : null;
    } else {
      const body = await request.json();
      nextStatus = body?.status as SubmissionStatus | undefined;
      decisionReason = String(body?.reason ?? '').trim();
      responseLetter = String(body?.response_letter ?? '').trim();
    }

    if (!nextStatus || !allowedStatus.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await getSubmissionById(context.params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!canTransitionStatus(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          error: `Invalid workflow transition: ${existing.status} -> ${nextStatus}`
        },
        { status: 409 }
      );
    }

    if (requiresDecisionReason(nextStatus) && !decisionReason) {
      return NextResponse.json({ error: 'Decision reason is required for rejection' }, { status: 400 });
    }

    const updated = await updateSubmissionStatus(context.params.id, nextStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const warnings: string[] = [];
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();

    if (responseFile) {
      const uploaded = await uploadEditorResponseFile(responseFile);
      if (uploaded.warning) warnings.push(`response file fallback: ${uploaded.warning}`);

      const fileRow = {
        id: randomUUID(),
        submission_id: context.params.id,
        file_kind: 'supporting' as const,
        file_name: responseFile.name,
        file_path: uploaded.path,
        content_type: responseFile.type || 'application/octet-stream',
        size_bytes: responseFile.size,
        created_at: now
      };

      runtimeSubmissionFiles.push(fileRow);
      writeRuntimeSubmissionFiles(runtimeSubmissionFiles);

      if (uploaded.mode === 'memory') {
        runtimeSubmissionFileBlobs.set(fileRow.id, {
          file_name: fileRow.file_name,
          content_type: fileRow.content_type,
          bytes: Buffer.from(await responseFile.arrayBuffer())
        });
      }

      if (supabase) {
        const insertFile = await supabase.from('submission_files').insert(fileRow);
        if (insertFile.error) warnings.push(`submission_files insert skipped: ${insertFile.error.message}`);
      }
    }

    const detailParts = [
      `status=${nextStatus}`,
      decisionReason ? `reason=${decisionReason}` : null,
      responseLetter ? `letter=${responseLetter.slice(0, 500)}` : null,
      responseFile ? `attachment=${responseFile.name}` : null
    ].filter(Boolean);

    const audit = {
      id: randomUUID(),
      submission_id: context.params.id,
      action: 'editor_status_updated',
      actor_email: sessionUser.email,
      detail: detailParts.join('; '),
      created_at: now
    };

    runtimeAuditLogs.push(audit);
    writeRuntimeAuditLogs(runtimeAuditLogs);

    if (supabase) {
      await supabase.from('audit_logs').insert(audit);
    }

    return NextResponse.json({
      data: updated,
      actor: sessionUser.email,
      reason: decisionReason || null,
      response_letter: responseLetter || null,
      warnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
