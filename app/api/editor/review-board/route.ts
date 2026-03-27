import { NextRequest, NextResponse } from 'next/server';
import { createEditorRecommendation, EditorRecommendation, listReviewBoard } from '@/lib/editor-review-service';
import { getServerSessionUser } from '@/lib/session';
import { getEditorialRole, listAssignedSubmissionIdsForEditor } from '@/lib/editor-workspace-service';

const allowed = new Set<EditorRecommendation>(['accept', 'major_revision', 'minor_revision', 'reject']);

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const ids = request.nextUrl.searchParams.getAll('submission_id');
    const board = await listReviewBoard(ids);
    return NextResponse.json({ data: board, editor_role: getEditorialRole(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }
    if (getEditorialRole(user) !== 'review_editor') {
      return NextResponse.json({ error: 'Only review editors can submit recommendations' }, { status: 403 });
    }

    const body = await request.json();
    const submissionId = String(body?.submission_id ?? '').trim();
    const recommendation = String(body?.recommendation ?? '').trim() as EditorRecommendation;
    const comment = String(body?.comment ?? '').trim();

    if (!submissionId) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
    }
    if (!allowed.has(recommendation)) {
      return NextResponse.json({ error: 'Invalid recommendation' }, { status: 400 });
    }

    const assignedIds = new Set(await listAssignedSubmissionIdsForEditor(user.email));
    if (!assignedIds.has(submissionId)) {
      return NextResponse.json({ error: 'You can only review manuscripts assigned to you' }, { status: 403 });
    }

    const created = await createEditorRecommendation({
      submissionId,
      editorEmail: user.email,
      recommendation,
      comment
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
