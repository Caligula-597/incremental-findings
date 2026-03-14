import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeIndexingExports, runtimeMetadataSnapshots } from '@/lib/runtime-store';
import { IndexingExportRecord, MetadataSnapshotRecord, Submission } from '@/lib/types';

function buildSnapshot(submission: Submission, format: MetadataSnapshotRecord['format']): string {
  const year = new Date(submission.created_at).getUTCFullYear();
  if (format === 'bibtex') {
    return `@article{${submission.id}, title={${submission.title}}, author={${submission.authors}}, journal={Incremental Findings}, year={${year}}}`;
  }
  if (format === 'ris') {
    return `TY  - JOUR\nTI  - ${submission.title}\nAU  - ${submission.authors}\nPY  - ${year}\nER  - `;
  }
  return JSON.stringify({
    id: submission.id,
    type: 'article-journal',
    title: submission.title,
    author: submission.authors,
    issued: { 'date-parts': [[year]] },
    DOI: submission.doi ?? undefined,
    URL: submission.file_url ?? undefined
  });
}

async function persistSnapshot(snapshot: MetadataSnapshotRecord) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('metadata_snapshots').insert(snapshot);
    if (!inserted.error) return;
  }
  runtimeMetadataSnapshots.unshift(snapshot);
}

export async function createIndexingExport(input: {
  submission: Submission;
  provider: string;
  actorEmail: string;
}) {
  const payload = {
    id: input.submission.id,
    title: input.submission.title,
    authors: input.submission.authors,
    abstract: input.submission.abstract,
    doi: input.submission.doi,
    url: input.submission.file_url,
    published_at: input.submission.created_at
  };

  const record: IndexingExportRecord = {
    id: randomUUID(),
    submission_id: input.submission.id,
    provider: input.provider,
    payload_json: JSON.stringify(payload),
    status: 'queued',
    actor_email: input.actorEmail,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('indexing_exports').insert(record);
    if (inserted.error) {
      runtimeIndexingExports.unshift(record);
    }
  } else {
    runtimeIndexingExports.unshift(record);
  }

  await persistSnapshot({
    id: randomUUID(),
    submission_id: input.submission.id,
    format: 'csl-json',
    content: buildSnapshot(input.submission, 'csl-json'),
    created_at: new Date().toISOString()
  });

  return record;
}

export async function listIndexingExports(submissionId?: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('indexing_exports').select('*').order('created_at', { ascending: false });
    if (submissionId) query = query.eq('submission_id', submissionId);
    const rows = await query;
    if (!rows.error) {
      return rows.data as IndexingExportRecord[];
    }
  }

  if (!submissionId) return runtimeIndexingExports;
  return runtimeIndexingExports.filter((item) => item.submission_id === submissionId);
}
