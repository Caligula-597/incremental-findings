import { randomUUID } from 'crypto';
import { runtimeSubmissionVersions } from '@/lib/runtime-store';
import { Submission, SubmissionVersionRecord } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase';

type CreateVersionInput = {
  submission: Submission;
  actorEmail: string;
  revisionSummary: string;
  fileUrl?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

function sortVersionsDesc(items: SubmissionVersionRecord[]) {
  return [...items].sort((a, b) => b.version_index - a.version_index || +new Date(b.created_at) - +new Date(a.created_at));
}

function normalizeVersionRow(row: Partial<SubmissionVersionRecord>): SubmissionVersionRecord {
  return {
    id: String(row.id ?? ''),
    submission_id: String(row.submission_id ?? ''),
    version_index: Number(row.version_index ?? 1),
    status_snapshot: (row.status_snapshot as Submission['status']) ?? 'under_review',
    file_url: row.file_url ?? null,
    revision_summary: String(row.revision_summary ?? ''),
    actor_email: String(row.actor_email ?? ''),
    metadata_json: row.metadata_json ?? null,
    created_at: row.created_at ?? new Date().toISOString()
  };
}

async function listVersionsSupabase(submissionId: string): Promise<SubmissionVersionRecord[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const query = await supabase
    .from('submission_versions')
    .select('id,submission_id,version_index,status_snapshot,file_url,revision_summary,actor_email,metadata_json,created_at')
    .eq('submission_id', submissionId)
    .order('version_index', { ascending: false })
    .order('created_at', { ascending: false });

  if (query.error) {
    return null;
  }

  return (query.data ?? []).map((row) => normalizeVersionRow(row as Partial<SubmissionVersionRecord>));
}

export async function listSubmissionVersions(submissionId: string): Promise<SubmissionVersionRecord[]> {
  const fromDb = await listVersionsSupabase(submissionId);
  if (fromDb) return fromDb;
  return sortVersionsDesc(runtimeSubmissionVersions.filter((item) => item.submission_id === submissionId));
}

export async function createSubmissionVersion(input: CreateVersionInput): Promise<SubmissionVersionRecord> {
  const existing = await listSubmissionVersions(input.submission.id);
  const nextVersionIndex = (existing[0]?.version_index ?? 0) + 1;
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  const createdAt = new Date().toISOString();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase
      .from('submission_versions')
      .insert({
        id: randomUUID(),
        submission_id: input.submission.id,
        version_index: nextVersionIndex,
        status_snapshot: input.submission.status,
        file_url: input.fileUrl ?? input.submission.file_url ?? null,
        revision_summary: input.revisionSummary,
        actor_email: input.actorEmail,
        metadata_json: metadataJson,
        created_at: createdAt
      })
      .select('id,submission_id,version_index,status_snapshot,file_url,revision_summary,actor_email,metadata_json,created_at')
      .single();

    if (!inserted.error && inserted.data) {
      return normalizeVersionRow(inserted.data as Partial<SubmissionVersionRecord>);
    }
  }

  const version: SubmissionVersionRecord = {
    id: randomUUID(),
    submission_id: input.submission.id,
    version_index: nextVersionIndex,
    status_snapshot: input.submission.status,
    file_url: input.fileUrl ?? input.submission.file_url ?? null,
    revision_summary: input.revisionSummary,
    actor_email: input.actorEmail,
    metadata_json: metadataJson,
    created_at: createdAt
  };

  runtimeSubmissionVersions.unshift(version);
  return version;
}
