import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listSubmissions } from '@/lib/submission-repository';
import { listSubmissionFilesBySubmissionIds } from '@/lib/submission-files-repository';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeAuditLogs } from '@/lib/runtime-store';
import { readRuntimeAuditLogs } from '@/lib/runtime-persistence';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const includeFiles = request.nextUrl.searchParams.get('include_files') === 'true';

    const all = await listSubmissions();
    const mineByAuthor = all.filter(
      (item) => item.author_id === sessionUser.id || item.authors.toLowerCase().includes(sessionUser.email.toLowerCase())
    );

    const mineByAuditIds = new Set<string>();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const logs = await supabase
        .from('audit_logs')
        .select('submission_id,actor_email,action')
        .eq('actor_email', sessionUser.email)
        .eq('action', 'submission_created');
      if (!logs.error) {
        for (const row of logs.data ?? []) {
          const id = String((row as { submission_id?: string }).submission_id ?? '');
          if (id) mineByAuditIds.add(id);
        }
      }
    } else {
      const logs = readRuntimeAuditLogs();
      const source = logs.length > 0 ? logs : runtimeAuditLogs;
      for (const row of source) {
        if (row.actor_email === sessionUser.email && row.action === 'submission_created') {
          mineByAuditIds.add(row.submission_id);
        }
      }
    }

    const mine = Array.from(
      new Map(
        [...mineByAuthor, ...all.filter((item) => mineByAuditIds.has(item.id))].map((item) => [item.id, item])
      ).values()
    );

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
