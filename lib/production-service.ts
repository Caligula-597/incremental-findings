import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeProductionJobs, runtimePublicationPackages } from '@/lib/runtime-store';
import { ProductionJobRecord, PublicationPackageRecord } from '@/lib/types';

async function insertProductionJob(job: ProductionJobRecord): Promise<ProductionJobRecord> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase.from('production_jobs').insert(job).select('*').single();
    if (!inserted.error && inserted.data) {
      return inserted.data as ProductionJobRecord;
    }
  }

  runtimeProductionJobs.unshift(job);
  return job;
}

export async function startProductionPipeline(input: {
  submissionId: string;
  editorEmail: string;
  note?: string;
}) {
  return insertProductionJob({
    id: randomUUID(),
    submission_id: input.submissionId,
    stage: 'started',
    editor_email: input.editorEmail,
    note: input.note ?? null,
    created_at: new Date().toISOString()
  });
}

export async function markProofReady(input: {
  submissionId: string;
  editorEmail: string;
  note?: string;
}) {
  return insertProductionJob({
    id: randomUUID(),
    submission_id: input.submissionId,
    stage: 'proof_ready',
    editor_email: input.editorEmail,
    note: input.note ?? null,
    created_at: new Date().toISOString()
  });
}

export async function publishProductionPackage(input: {
  submissionId: string;
  editorEmail: string;
  packageUrl: string;
  checksum?: string;
  note?: string;
}): Promise<{ job: ProductionJobRecord; packageRecord: PublicationPackageRecord }> {
  const packageRecord: PublicationPackageRecord = {
    id: randomUUID(),
    submission_id: input.submissionId,
    package_url: input.packageUrl,
    checksum: input.checksum ?? null,
    editor_email: input.editorEmail,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const insertedPackage = await supabase.from('publication_packages').insert(packageRecord).select('*').single();
    if (!insertedPackage.error && insertedPackage.data) {
      const job = await insertProductionJob({
        id: randomUUID(),
        submission_id: input.submissionId,
        stage: 'package_published',
        editor_email: input.editorEmail,
        note: input.note ?? null,
        created_at: new Date().toISOString()
      });

      return {
        job,
        packageRecord: insertedPackage.data as PublicationPackageRecord
      };
    }
  }

  runtimePublicationPackages.unshift(packageRecord);
  const job = await insertProductionJob({
    id: randomUUID(),
    submission_id: input.submissionId,
    stage: 'package_published',
    editor_email: input.editorEmail,
    note: input.note ?? null,
    created_at: new Date().toISOString()
  });

  return { job, packageRecord };
}

export async function listProductionEvents(submissionId: string): Promise<ProductionJobRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const rows = await supabase
      .from('production_jobs')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });

    if (!rows.error) {
      return (rows.data ?? []) as ProductionJobRecord[];
    }
  }

  return runtimeProductionJobs.filter((item) => item.submission_id === submissionId);
}
