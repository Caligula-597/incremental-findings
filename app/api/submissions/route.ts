import { NextRequest, NextResponse } from 'next/server';
import { createSubmission, listSubmissions } from '@/lib/submission-repository';
import { listSubmissionFilesBySubmissionIds } from '@/lib/submission-files-repository';
import { getServerSessionUser } from '@/lib/session';
import { listAssignedSubmissionIdsForEditor, isManagingEditor } from '@/lib/editor-workspace-service';
import { Submission, SubmissionStatus } from '@/lib/types';

const allowedStatus = new Set<SubmissionStatus>(['under_review', 'accepted', 'in_production', 'published', 'rejected']);

async function filterVisibleEditorialSubmissions(items: Submission[], email: string) {
  if (isManagingEditor(email)) return items;
  const assignedIds = new Set(await listAssignedSubmissionIdsForEditor(email));
  return items.filter((item) => assignedIds.has(item.id));
}

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') as SubmissionStatus | null;
    const discipline = request.nextUrl.searchParams.get('discipline');
    const articleType = request.nextUrl.searchParams.get('article_type');
    const includeFiles = request.nextUrl.searchParams.get('include_files') === 'true';

    if (status && !allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const sessionUser = getServerSessionUser();

    if (status && status !== 'published') {
      if (!sessionUser || sessionUser.role !== 'editor') {
        return NextResponse.json({ error: 'Editor authorization required for non-public queues' }, { status: 403 });
      }
    }

    let data = await listSubmissions(status ?? undefined);

    if (!status && (!sessionUser || sessionUser.role !== 'editor')) {
      data = data.filter((item) => item.status === 'published');
    }

    if (sessionUser?.role === 'editor' && ((status && status !== 'published') || !status)) {
      data = await filterVisibleEditorialSubmissions(data, sessionUser.email);
    }

    const filtered = data.filter((item) => {
      const disciplineMatch = discipline ? item.discipline === discipline : true;
      const articleTypeMatch = articleType ? item.article_type === articleType : true;
      return disciplineMatch && articleTypeMatch;
    });

    if (includeFiles) {
      if (!sessionUser || sessionUser.role !== 'editor') {
        return NextResponse.json({ error: 'Editor authorization required for file visibility' }, { status: 403 });
      }

      const fileMap = await listSubmissionFilesBySubmissionIds(filtered.map((item) => item.id));
      return NextResponse.json({ data: filtered.map((item) => ({ ...item, files: fileMap[item.id] ?? [] })) });
    }

    return NextResponse.json({ data: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getServerSessionUser();
    if (!sessionUser || sessionUser.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.title || !body.authors) {
      return NextResponse.json({ error: 'Missing required fields: title, authors' }, { status: 400 });
    }

    const created = await createSubmission({
      title: String(body.title),
      authors: String(body.authors),
      abstract: body.abstract ? String(body.abstract) : undefined,
      discipline: body.discipline ? String(body.discipline) : undefined,
      topic: body.topic ? String(body.topic) : undefined,
      article_type: body.article_type ? String(body.article_type) : undefined,
      file_url: body.file_url ? String(body.file_url) : undefined,
      author_id: body.author_id ? String(body.author_id) : undefined
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
