import { mockSubmissions } from '@/lib/mock-data';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Submission, SubmissionInput, SubmissionStatus } from '@/lib/types';

const memoryStore = [...mockSubmissions];

function sortByCreatedDesc(items: Submission[]) {
  return [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

function normalizeSubmission(data: Partial<Submission>): Submission {
  return {
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    authors: String(data.authors ?? ''),
    abstract: data.abstract ?? null,
    discipline: data.discipline ?? null,
    topic: data.topic ?? null,
    article_type: data.article_type ?? null,
    status: (data.status as SubmissionStatus) ?? 'pending',
    file_url: data.file_url ?? null,
    created_at: data.created_at ?? new Date().toISOString()
  };
}

async function listWithFlexibleColumns(status?: SubmissionStatus): Promise<Submission[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const preferredSelect = 'id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at';
  const legacySelect = 'id,title,authors,abstract,status,file_url,created_at';

  let query = supabase.from('submissions').select(preferredSelect).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const preferred = await query;

  if (!preferred.error) {
    return (preferred.data ?? []).map((row) => normalizeSubmission(row as Partial<Submission>));
  }

  let fallbackQuery = supabase.from('submissions').select(legacySelect).order('created_at', { ascending: false });
  if (status) fallbackQuery = fallbackQuery.eq('status', status);

  const fallback = await fallbackQuery;
  if (fallback.error) {
    throw new Error(`Failed to list submissions: ${fallback.error.message}`);
  }

  return (fallback.data ?? []).map((row) => normalizeSubmission(row as Partial<Submission>));
}

export async function listSubmissions(status?: SubmissionStatus): Promise<Submission[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    return listWithFlexibleColumns(status);
  }

  if (!status) {
    return sortByCreatedDesc(memoryStore);
  }
  return sortByCreatedDesc(memoryStore.filter((entry) => entry.status === status));
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const insertPayload = {
      title: input.title,
      authors: input.authors,
      abstract: input.abstract ?? null,
      discipline: input.discipline ?? null,
      topic: input.topic ?? null,
      article_type: input.article_type ?? null,
      file_url: input.file_url ?? null,
      status: 'pending'
    };

    const preferred = await supabase
      .from('submissions')
      .insert(insertPayload)
      .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at')
      .single();

    if (!preferred.error) {
      return normalizeSubmission(preferred.data as Partial<Submission>);
    }

    const legacy = await supabase
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

    if (legacy.error) {
      throw new Error(`Failed to create submission: ${legacy.error.message}`);
    }

    return normalizeSubmission(legacy.data as Partial<Submission>);
  }

  const created: Submission = {
    id: `s-${crypto.randomUUID()}`,
    title: input.title,
    authors: input.authors,
    abstract: input.abstract ?? null,
    discipline: input.discipline ?? null,
    topic: input.topic ?? null,
    article_type: input.article_type ?? null,
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
    const preferred = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at')
      .maybeSingle();

    if (!preferred.error) {
      return preferred.data ? normalizeSubmission(preferred.data as Partial<Submission>) : null;
    }

    const legacy = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select('id,title,authors,abstract,status,file_url,created_at')
      .maybeSingle();

    if (legacy.error) {
      throw new Error(`Failed to update status: ${legacy.error.message}`);
    }

    return legacy.data ? normalizeSubmission(legacy.data as Partial<Submission>) : null;
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
