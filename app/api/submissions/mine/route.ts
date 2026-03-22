import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listSubmissions } from '@/lib/submission-repository';
import { listSubmissionFilesBySubmissionIds } from '@/lib/submission-files-repository';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeAuditLogs } from '@/lib/runtime-store';
import { readRuntimeAuditLogs } from '@/lib/runtime-persistence';

function parseMetaB64(detail: string | undefined) {
  if (!detail) return null;
  const matched = detail.match(/meta_b64=([A-Za-z0-9_-]+)/);
  if (!matched?.[1]) return null;
  try {
    return JSON.parse(Buffer.from(matched[1], 'base64url').toString('utf8')) as Partial<{
      authors: string;
      abstract: string;
      discipline: string;
      topic: string;
      article_type: string;
      category: string;
      doi: string;
    }>;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const includeFiles = request.nextUrl.searchParams.get('include_files') === 'true';

    const all = await listSubmissions();
    const normalizedEmail = sessionUser.email.toLowerCase();
    const mineByAuthor = all.filter((item) => {
      const byAuthorId = Boolean(item.author_id && sessionUser.id && item.author_id === sessionUser.id);
      const bySubmitterEmail = Boolean(item.submitter_email && item.submitter_email.toLowerCase() === normalizedEmail);
      const byAuthorsText = item.authors.toLowerCase().includes(normalizedEmail);
      return byAuthorId || bySubmitterEmail || byAuthorsText;
    });

    const mineByAuditIds = new Set<string>();
    const metadataBySubmissionId = new Map<string, Partial<{ authors: string; abstract: string; discipline: string; topic: string; article_type: string; category: string; doi: string }>>();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const logs = await supabase
        .from('audit_logs')
        .select('submission_id,actor_email,action,detail')
        .eq('actor_email', sessionUser.email)
        .eq('action', 'submission_created');
      if (!logs.error) {
        for (const row of logs.data ?? []) {
          const typed = row as { submission_id?: string; detail?: string };
          const id = String(typed.submission_id ?? '');
          if (id) {
            mineByAuditIds.add(id);
            const parsed = parseMetaB64(typed.detail);
            if (parsed) metadataBySubmissionId.set(id, parsed);
          }
        }
      }
    } else {
      const logs = readRuntimeAuditLogs();
      const source = logs.length > 0 ? logs : runtimeAuditLogs;
      for (const row of source) {
        if (row.actor_email === sessionUser.email && row.action === 'submission_created') {
          mineByAuditIds.add(row.submission_id);
          const parsed = parseMetaB64(row.detail);
          if (parsed) metadataBySubmissionId.set(row.submission_id, parsed);
        }
      }
    }

    const mine = Array.from(
      new Map(
        [...mineByAuthor, ...all.filter((item) => mineByAuditIds.has(item.id))].map((item) => [item.id, item])
      ).values()
    ).map((item) => {
      const meta = metadataBySubmissionId.get(item.id);
      if (!meta) return item;
      return {
        ...item,
        authors: item.authors || meta.authors || item.authors,
        abstract: item.abstract || meta.abstract || item.abstract,
        discipline: item.discipline || meta.discipline || item.discipline,
        topic: item.topic || meta.topic || item.topic,
        article_type: item.article_type || meta.article_type || item.article_type,
        doi: item.doi || meta.doi || item.doi,
        category: item.category || meta.category || item.category
      };
    });

    if (!includeFiles || mine.length === 0) {
      return NextResponse.json({ data: mine });
    }

    const fileMap = await listSubmissionFilesBySubmissionIds(mine.map((item) => item.id));
    const withFiles = mine.map((item) => ({ ...item, files: fileMap[item.id] ?? [] }));
    return NextResponse.json({ data: withFiles });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
