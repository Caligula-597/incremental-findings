import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listIndexingExports } from '@/lib/indexing-service';

export async function GET(request: Request) {
  try {
    const user = getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const submissionId = String(url.searchParams.get('submission_id') ?? '').trim() || undefined;

    const data = await listIndexingExports(submissionId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
