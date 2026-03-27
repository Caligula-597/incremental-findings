import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getSupabaseServerClient } from '@/lib/supabase';
import { readRuntimeAuditLogs } from '@/lib/runtime-persistence';
import { runtimeAuditLogs } from '@/lib/runtime-store';
import { getSubmissionById } from '@/lib/submission-repository';

const trackedActions = new Set(['editor_file_viewed', 'editor_status_updated', 'editor_response_uploaded', 'editor_submission_assigned', 'editor_review_recommendation', 'editor_review_final_decision']);

export async function GET() {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    let rows: Array<{ submission_id: string; action: string; detail: string; created_at: string }> = [];

    if (supabase) {
      const result = await supabase
        .from('audit_logs')
        .select('submission_id,action,detail,created_at')
        .eq('actor_email', user.email)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!result.error) {
        rows = (result.data ?? [])
          .map((item) => item as { submission_id: string; action: string; detail: string; created_at: string })
          .filter((item) => trackedActions.has(item.action));
      }
    }

    if (rows.length === 0) {
      const logs = readRuntimeAuditLogs();
      const source = logs.length > 0 ? logs : runtimeAuditLogs;
      rows = source
        .filter((row) => row.actor_email === user.email && trackedActions.has(row.action))
        .map((row) => ({ submission_id: row.submission_id, action: row.action, detail: row.detail, created_at: row.created_at }))
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    const top = rows.slice(0, 30);
    const ids = Array.from(new Set(top.map((item) => item.submission_id)));
    const titleMap: Record<string, string> = {};

    for (const id of ids) {
      const submission = await getSubmissionById(id);
      if (submission) {
        titleMap[id] = submission.title;
      }
    }

    return NextResponse.json({
      data: top.map((item) => ({
        ...item,
        title: titleMap[item.submission_id] ?? item.submission_id
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
