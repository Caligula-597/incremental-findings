import { mockSubmissions } from '@/lib/mock-data';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Submission, SubmissionInput, SubmissionStatus } from '@/lib/types';

const memoryStore = [...mockSubmissions];

function sortByCreatedDesc(items: Submission[]) {
  return [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function listSubmissions(status?: SubmissionStatus): Promise<Submission[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    let query = supabase
      .from('submissions')
      .select('id,title,authors,abstract,status,file_url,created_at')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list submissions: ${error.message}`);
    }

    return (data ?? []) as Submission[];
  }

  if (!status) {
    return sortByCreatedDesc(memoryStore);
  }
  return sortByCreatedDesc(memoryStore.filter((entry) => entry.status === status));
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        title: input.title,
        authors: input.authors,
        abstract: input.abstract ?? null,
        file_url: input.file_url ?? null,
        status: 'pending'
      })
      .select('id,title,authors,abstract,status,file_url,created_at')
      .single();

    if (error) {
      throw new Error(`Failed to create submission: ${error.message}`);
    }

    return data as Submission;
  }

  const created: Submission = {
    id: `s-${crypto.randomUUID()}`,
    title: input.title,
    authors: input.authors,
    abstract: input.abstract ?? null,
    file_url: input.file_url ?? null,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  memoryStore.unshift(created);
  return created;
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<Submission | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select('id,title,authors,abstract,status,file_url,created_at')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }

    return (data as Submission | null) ?? null;
  }

  const entry = memoryStore.find((item) => item.id === id);
  if (!entry) {
    return null;
  }

  entry.status = status;
  return entry;
}

export async function publishSubmission(id: string): Promise<Submission | null> {
  return updateSubmissionStatus(id, 'published');
}
