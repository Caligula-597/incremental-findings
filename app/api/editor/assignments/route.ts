import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import {
  createSubmissionEditorAssignment,
  getEditorialRole,
  listAssignedSubmissionIdsForEditor,
  listEditorialRoster,
  listSubmissionEditorAssignments,
  isManagingEditor
} from '@/lib/editor-workspace-service';
import { getSubmissionById } from '@/lib/submission-repository';

export async function GET(request: NextRequest) {
  try {
    const user = getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }

    const requestedIds = request.nextUrl.searchParams.getAll('submission_id');
    const submissionIds = isManagingEditor(user) ? requestedIds : await listAssignedSubmissionIdsForEditor(user.email);
    const assignments = await listSubmissionEditorAssignments(submissionIds);
    const roster = isManagingEditor(user) ? await listEditorialRoster() : [];

    return NextResponse.json({
      data: {
        assignments,
        roster,
        editor_role: getEditorialRole(user)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getServerSessionUser();
    if (!user || user.role !== 'editor') {
      return NextResponse.json({ error: 'Editor authorization required' }, { status: 403 });
    }
    if (!isManagingEditor(user)) {
      return NextResponse.json({ error: 'Managing editor authorization required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const submissionId = String(body.submission_id ?? '').trim();
    const assignedEditorEmail = String(body.assigned_editor_email ?? '').trim().toLowerCase();

    if (!submissionId || !assignedEditorEmail) {
      return NextResponse.json({ error: 'submission_id and assigned_editor_email are required' }, { status: 400 });
    }
    if (isManagingEditor(assignedEditorEmail)) {
      return NextResponse.json({ error: 'Assign manuscripts to review editors, not managing editors' }, { status: 400 });
    }

    const roster = await listEditorialRoster();
    const matchedReviewEditor = roster.find((entry) => entry.email === assignedEditorEmail && entry.role === 'review_editor');
    if (!matchedReviewEditor) {
      return NextResponse.json({ error: 'Assign manuscripts only to approved or invited review editors' }, { status: 400 });
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (submission.status !== 'under_review') {
      return NextResponse.json({ error: 'Only under_review submissions can be assigned to review editors' }, { status: 409 });
    }

    const created = await createSubmissionEditorAssignment({
      submissionId,
      assignedEditorEmail,
      assignedByEmail: user.email
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
