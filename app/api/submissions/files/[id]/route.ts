import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getServerSessionUser } from '@/lib/session';
import { getSubmissionById } from '@/lib/submission-repository';
import { getSubmissionFileById } from '@/lib/submission-files-repository';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeAuditLogs, runtimeSubmissionFileBlobs } from '@/lib/runtime-store';
import { getRuntimeStorageDir, writeRuntimeAuditLogs } from '@/lib/runtime-persistence';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const file = await getSubmissionFileById(context.params.id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const submission = await getSubmissionById(file.submission_id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const isEditor = sessionUser.role === 'editor';
    const isOwner =
      submission.author_id === sessionUser.id ||
      submission.submitter_email?.toLowerCase() === sessionUser.email.toLowerCase() ||
      submission.authors.toLowerCase().includes(sessionUser.email.toLowerCase());
    if (!isEditor && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    if (isEditor) {
      const audit = {
        id: randomUUID(),
        submission_id: submission.id,
        action: 'editor_file_viewed',
        actor_email: sessionUser.email,
        detail: `file_id=${file.id}; file_name=${file.file_name}`,
        created_at: new Date().toISOString()
      };
      runtimeAuditLogs.push(audit);
      writeRuntimeAuditLogs(runtimeAuditLogs);
      const supabase = getSupabaseServerClient();
      if (supabase) {
        void supabase.from('audit_logs').insert(audit);
      }
    }

    const memoryBlob = runtimeSubmissionFileBlobs.get(file.id);
    if (memoryBlob) {
      return new NextResponse(memoryBlob.bytes, {
        headers: {
          'Content-Type': memoryBlob.content_type || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${memoryBlob.file_name}"`
        }
      });
    }


    if (file.file_path.startsWith('local://')) {
      const rel = file.file_path.slice('local://'.length);
      const fullPath = join(getRuntimeStorageDir(), 'files', rel);
      try {
        const bytes = readFileSync(fullPath);
        return new NextResponse(bytes, {
          headers: {
            'Content-Type': file.content_type || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${file.file_name}"`
          }
        });
      } catch {
        return NextResponse.json({ error: 'File not found on local runtime storage' }, { status: 404 });
      }
    }

    if (file.file_path.startsWith('http://') || file.file_path.startsWith('https://')) {
      return NextResponse.redirect(file.file_path);
    }

    if (file.file_path.startsWith('supabase://')) {
      const marker = 'supabase://';
      const value = file.file_path.slice(marker.length);
      const slash = value.indexOf('/');
      const bucket = slash > -1 ? value.slice(0, slash) : 'papers';
      const objectPath = slash > -1 ? value.slice(slash + 1) : value;

      const supabase = getSupabaseServerClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Storage unavailable in current runtime mode' }, { status: 503 });
      }

      const download = await supabase.storage.from(bucket).download(objectPath);
      if (download.error || !download.data) {
        return NextResponse.json({ error: `Unable to open file: ${download.error?.message ?? 'not found'}` }, { status: 404 });
      }

      const bytes = Buffer.from(await download.data.arrayBuffer());
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': file.content_type || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${file.file_name}"`
        }
      });
    }


    const supabase = getSupabaseServerClient();
    if (supabase) {
      const fallbackDownload = await supabase.storage.from('papers').download(file.file_path);
      if (!fallbackDownload.error && fallbackDownload.data) {
        const bytes = Buffer.from(await fallbackDownload.data.arrayBuffer());
        return new NextResponse(bytes, {
          headers: {
            'Content-Type': file.content_type || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${file.file_name}"`
          }
        });
      }
    }

    return NextResponse.json({ error: 'Unsupported file pointer' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
