import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeSubmissionFiles } from '@/lib/runtime-store';
import { readRuntimeSubmissionFiles } from '@/lib/runtime-persistence';
import { SubmissionFileRecord } from '@/lib/types';

export async function listSubmissionFilesBySubmissionIds(submissionIds: string[]): Promise<Record<string, SubmissionFileRecord[]>> {
  const uniqueIds = Array.from(new Set(submissionIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const supabase = getSupabaseServerClient();
  const grouped: Record<string, SubmissionFileRecord[]> = {};

  if (supabase) {
    const result = await supabase
      .from('submission_files')
      .select('*')
      .in('submission_id', uniqueIds)
      .order('created_at', { ascending: true });

    if (!result.error && Array.isArray(result.data)) {
      for (const row of result.data as SubmissionFileRecord[]) {
        if (!grouped[row.submission_id]) grouped[row.submission_id] = [];
        grouped[row.submission_id].push(row);
      }

      const localFiles = readRuntimeSubmissionFiles();
      const source = localFiles.length > 0 ? localFiles : runtimeSubmissionFiles;
      for (const row of source.filter((file) => uniqueIds.includes(file.submission_id))) {
        if (!grouped[row.submission_id]) grouped[row.submission_id] = [];
        if (!grouped[row.submission_id].some((existing) => existing.id === row.id)) {
          grouped[row.submission_id].push(row);
        }
      }

      return grouped;
    }
  }

  const localFiles = readRuntimeSubmissionFiles();
  const source = localFiles.length > 0 ? localFiles : runtimeSubmissionFiles;
  for (const row of source.filter((file) => uniqueIds.includes(file.submission_id))) {
    if (!grouped[row.submission_id]) grouped[row.submission_id] = [];
    grouped[row.submission_id].push(row);
  }

  return grouped;
}

export async function getSubmissionFileById(fileId: string): Promise<SubmissionFileRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase.from('submission_files').select('*').eq('id', fileId).maybeSingle();
    if (!result.error && result.data) {
      return result.data as SubmissionFileRecord;
    }
  }

  const localFiles = readRuntimeSubmissionFiles();
  const source = localFiles.length > 0 ? localFiles : runtimeSubmissionFiles;
  return source.find((item) => item.id === fileId) ?? null;
}
