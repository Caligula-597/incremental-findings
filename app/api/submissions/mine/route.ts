import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { listSubmissions } from '@/lib/submission-repository';
import { listSubmissionFilesBySubmissionIds } from '@/lib/submission-files-repository';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const includeFiles = request.nextUrl.searchParams.get('include_files') === 'true';

    const all = await listSubmissions();
    const mine = all.filter(
      (item) => item.author_id === sessionUser.id || item.authors.toLowerCase().includes(sessionUser.email.toLowerCase())
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
