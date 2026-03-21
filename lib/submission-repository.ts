import { mockSubmissions } from '@/lib/mock-data';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Submission, SubmissionInput, SubmissionStatus } from '@/lib/types';
import { readRuntimeSubmissions, writeRuntimeSubmissions } from '@/lib/runtime-persistence';
import { assertSupabaseAvailability } from '@/lib/env-guard';

let memoryStore = [...mockSubmissions] as Submission[];

function getMemoryStore() {
  const persisted = readRuntimeSubmissions();
  if (persisted.length > 0) return persisted;
  return memoryStore;
}

function setMemoryStore(next: Submission[]) {
  memoryStore = next;
  writeRuntimeSubmissions(next);
}

function sortByCreatedDesc(items: Submission[]) {
  return [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

function isAuthorForeignKeyViolation(message: string | undefined) {
  return Boolean(message && /submissions_author_id_fkey/i.test(message));
}

function normalizeSubmission(data: Partial<Submission>): Submission {
  const category = (data as { category?: string | null }).category ?? null;
  const authorId = (data as { author_id?: string | null }).author_id ?? null;
  const submitterEmail = (data as { submitter_email?: string | null }).submitter_email ?? null;

  return {
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    authors: String(data.authors ?? (authorId ? `Author ${authorId.slice(0, 8)}` : 'Unknown author')),
    abstract: data.abstract ?? null,
    discipline: data.discipline ?? category,
    topic: data.topic ?? null,
    article_type: data.article_type ?? null,
    status: (data.status as SubmissionStatus) ?? 'under_review',
    file_url: data.file_url ?? null,
    created_at: data.created_at ?? new Date().toISOString(),
    doi: (data as { doi?: string | null }).doi ?? null,
    doi_registered_at: (data as { doi_registered_at?: string | null }).doi_registered_at ?? null,
    author_id: authorId,
    category,
    submitter_email: submitterEmail
  };
}

async function listWithFlexibleColumns(status?: SubmissionStatus): Promise<Submission[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const preferredSelect = 'id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at,doi,doi_registered_at,author_id,submitter_email';
  const legacySelect = 'id,title,authors,abstract,status,file_url,created_at,author_id,submitter_email';
  const v2Select = 'id,title,authors,abstract,status,category,file_url,created_at,author_id,submitter_email';

  let query = supabase.from('submissions').select(preferredSelect).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const preferred = await query;
  if (!preferred.error) {
    return (preferred.data ?? []).map((row) => normalizeSubmission(row as Partial<Submission>));
  }

  let fallbackQuery = supabase.from('submissions').select(legacySelect).order('created_at', { ascending: false });
  if (status) fallbackQuery = fallbackQuery.eq('status', status);
  const fallback = await fallbackQuery;
  if (!fallback.error) {
    return (fallback.data ?? []).map((row) => normalizeSubmission(row as Partial<Submission>));
  }

  let v2Query = supabase.from('submissions').select(v2Select).order('created_at', { ascending: false });
  if (status) v2Query = v2Query.eq('status', status);
  const v2 = await v2Query;
  if (v2.error) {
    throw new Error(`Failed to list submissions: ${v2.error.message}`);
  }

  return (v2.data ?? []).map((row) => normalizeSubmission(row as Partial<Submission>));
}

export async function listSubmissions(status?: SubmissionStatus): Promise<Submission[]> {
  const supabase = getSupabaseServerClient();
  assertSupabaseAvailability(Boolean(supabase));
  if (supabase) return listWithFlexibleColumns(status);

  const store = getMemoryStore();
  if (!status) return sortByCreatedDesc(store);
  return sortByCreatedDesc(store.filter((entry) => entry.status === status));
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const supabase = getSupabaseServerClient();
  assertSupabaseAvailability(Boolean(supabase));

  if (supabase) {
    const baseInsert = {
      title: input.title,
      authors: input.authors ?? null,
      abstract: input.abstract ?? null,
      discipline: input.discipline ?? null,
      topic: input.topic ?? null,
      article_type: input.article_type ?? null,
      file_url: input.file_url ?? null,
      status: 'under_review',
      doi: input.doi ?? null,
      doi_registered_at: input.doi_registered_at ?? null,
      submitter_email: input.submitter_email ?? null
    };

    const preferred = await supabase
      .from('submissions')
      .insert({
        ...baseInsert,
        author_id: input.author_id ?? null
      })
      .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at,doi,doi_registered_at,author_id,submitter_email')
      .single();

    if (!preferred.error) {
      return normalizeSubmission(preferred.data as Partial<Submission>);
    }

    if (isAuthorForeignKeyViolation(preferred.error.message)) {
      const preferredNoAuthor = await supabase
        .from('submissions')
        .insert(baseInsert)
        .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at,doi,doi_registered_at,author_id,submitter_email')
        .single();

      if (!preferredNoAuthor.error) {
        return normalizeSubmission(preferredNoAuthor.data as Partial<Submission>);
      }
    }

    const legacy = await supabase
      .from('submissions')
      .insert({
        title: input.title,
        authors: input.authors ?? null,
        abstract: input.abstract ?? null,
        file_url: input.file_url ?? null,
        status: 'under_review',
        author_id: input.author_id ?? null,
        submitter_email: input.submitter_email ?? null
      })
      .select('id,title,authors,abstract,status,file_url,created_at,author_id,submitter_email')
      .single();

    if (!legacy.error) {
      const normalized = normalizeSubmission(legacy.data as Partial<Submission>);
      normalized.doi = input.doi ?? null;
      normalized.doi_registered_at = input.doi_registered_at ?? null;
      return normalized;
    }

    if (isAuthorForeignKeyViolation(legacy.error.message)) {
      const legacyNoAuthor = await supabase
        .from('submissions')
        .insert({
          title: input.title,
          authors: input.authors ?? null,
          abstract: input.abstract ?? null,
          file_url: input.file_url ?? null,
          status: 'under_review',
          submitter_email: input.submitter_email ?? null
        })
        .select('id,title,authors,abstract,status,file_url,created_at,author_id,submitter_email')
        .single();

      if (!legacyNoAuthor.error) {
        const normalized = normalizeSubmission(legacyNoAuthor.data as Partial<Submission>);
        normalized.doi = input.doi ?? null;
        normalized.doi_registered_at = input.doi_registered_at ?? null;
        return normalized;
      }
    }

    const v2 = await supabase
      .from('submissions')
      .insert({
        title: input.title,
        abstract: input.abstract ?? null,
        file_url: input.file_url ?? null,
        status: 'under_review',
        category: input.category ?? input.discipline ?? null,
        author_id: input.author_id ?? null,
        submitter_email: input.submitter_email ?? null
      })
      .select('id,title,abstract,status,category,file_url,created_at,author_id,submitter_email')
      .single();

    if (v2.error) {
      if (isAuthorForeignKeyViolation(v2.error.message)) {
        const v2NoAuthor = await supabase
          .from('submissions')
          .insert({
            title: input.title,
            abstract: input.abstract ?? null,
            file_url: input.file_url ?? null,
            status: 'under_review',
            category: input.category ?? input.discipline ?? null,
            submitter_email: input.submitter_email ?? null
          })
          .select('id,title,abstract,status,category,file_url,created_at,author_id,submitter_email')
          .single();

        if (!v2NoAuthor.error) {
          const normalizedV2 = normalizeSubmission(v2NoAuthor.data as Partial<Submission>);
          normalizedV2.doi = input.doi ?? null;
          normalizedV2.doi_registered_at = input.doi_registered_at ?? null;
          return normalizedV2;
        }
      }

      throw new Error(`Failed to create submission: ${v2.error.message}`);
    }

    const normalizedV2 = normalizeSubmission(v2.data as Partial<Submission>);
    normalizedV2.doi = input.doi ?? null;
    normalizedV2.doi_registered_at = input.doi_registered_at ?? null;
    return normalizedV2;
  }

  const created: Submission = {
    id: `s-${crypto.randomUUID()}`,
    title: input.title,
    authors: input.authors ?? (input.author_id ? `Author ${input.author_id.slice(0, 8)}` : 'Unknown author'),
    abstract: input.abstract ?? null,
    discipline: input.discipline ?? input.category ?? null,
    topic: input.topic ?? null,
    article_type: input.article_type ?? null,
    status: 'under_review',
    file_url: input.file_url ?? null,
    created_at: new Date().toISOString(),
    doi: input.doi ?? null,
    doi_registered_at: input.doi_registered_at ?? null,
    author_id: input.author_id ?? null,
    category: input.category ?? input.discipline ?? null,
    submitter_email: input.submitter_email ?? null
  };

  const store = getMemoryStore();
  store.unshift(created);
  setMemoryStore(store);
  return created;
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const supabase = getSupabaseServerClient();
  assertSupabaseAvailability(Boolean(supabase));

  if (supabase) {
    const preferred = await supabase
      .from('submissions')
      .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at,doi,doi_registered_at,author_id,submitter_email')
      .eq('id', id)
      .maybeSingle();

    if (!preferred.error) {
      return preferred.data ? normalizeSubmission(preferred.data as Partial<Submission>) : null;
    }

    const legacy = await supabase
      .from('submissions')
      .select('id,title,authors,abstract,status,file_url,created_at,author_id,submitter_email')
      .eq('id', id)
      .maybeSingle();

    if (legacy.error) {
      throw new Error(`Failed to load submission: ${legacy.error.message}`);
    }

    return legacy.data ? normalizeSubmission(legacy.data as Partial<Submission>) : null;
  }

  return getMemoryStore().find((item) => item.id === id) ?? null;
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<Submission | null> {
  const supabase = getSupabaseServerClient();
  assertSupabaseAvailability(Boolean(supabase));

  if (supabase) {
    const preferred = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at,doi,doi_registered_at,author_id,submitter_email')
      .maybeSingle();

    if (!preferred.error) {
      return preferred.data ? normalizeSubmission(preferred.data as Partial<Submission>) : null;
    }

    const legacy = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select('id,title,authors,abstract,status,file_url,created_at,author_id,submitter_email')
      .maybeSingle();

    if (legacy.error) {
      throw new Error(`Failed to update status: ${legacy.error.message}`);
    }

    return legacy.data ? normalizeSubmission(legacy.data as Partial<Submission>) : null;
  }

  const store = getMemoryStore();
  const entry = store.find((item) => item.id === id);
  if (!entry) return null;
  entry.status = status;
  setMemoryStore(store);
  return entry;
}

export async function assignSubmissionDoi(id: string, doi: string, registeredAt: string): Promise<Submission | null> {
  const supabase = getSupabaseServerClient();
  assertSupabaseAvailability(Boolean(supabase));

  if (supabase) {
    const preferred = await supabase
      .from('submissions')
      .update({ doi, doi_registered_at: registeredAt })
      .eq('id', id)
      .select('id,title,authors,abstract,discipline,topic,article_type,status,file_url,created_at,doi,doi_registered_at,author_id,submitter_email')
      .maybeSingle();

    if (!preferred.error) {
      return preferred.data ? normalizeSubmission(preferred.data as Partial<Submission>) : null;
    }

    const legacy = await supabase.from('submissions').update({ doi }).eq('id', id).select('id,title,authors,abstract,status,file_url,created_at,author_id,submitter_email').maybeSingle();
    if (legacy.error) {
      throw new Error(`Failed to assign DOI: ${legacy.error.message}`);
    }

    if (!legacy.data) return null;
    const normalized = normalizeSubmission(legacy.data as Partial<Submission>);
    normalized.doi = doi;
    normalized.doi_registered_at = registeredAt;
    return normalized;
  }

  const store = getMemoryStore();
  const entry = store.find((item) => item.id === id);
  if (!entry) return null;
  entry.doi = doi;
  entry.doi_registered_at = registeredAt;
  setMemoryStore(store);
  return entry;
}

export async function publishSubmission(id: string): Promise<Submission | null> {
  return updateSubmissionStatus(id, 'published');
}


export async function deleteSubmission(id: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  assertSupabaseAvailability(Boolean(supabase));

  if (supabase) {
    const existing = await getSubmissionById(id);
    if (!existing) return false;

    const remove = await supabase.from('submissions').delete().eq('id', id);
    if (remove.error) {
      throw new Error(`Failed to delete submission: ${remove.error.message}`);
    }
    return true;
  }

  const store = getMemoryStore();
  const next = store.filter((item) => item.id !== id);
  if (next.length === store.length) return false;
  setMemoryStore(next);
  return true;
}
