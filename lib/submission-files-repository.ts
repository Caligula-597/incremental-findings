import { getSupabaseServerClient } from '@/lib/supabase';
import { runtimeSubmissionFiles } from '@/lib/runtime-store';
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
      return grouped;
    }
  }

  for (const row of runtimeSubmissionFiles.filter((file) => uniqueIds.includes(file.submission_id))) {
    if (!grouped[row.submission_id]) grouped[row.submission_id] = [];
    grouped[row.submission_id].push(row);
  }

  return grouped;
}
