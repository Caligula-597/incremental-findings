import { mockSubmissions } from '@/lib/mock-data';
import { Submission, SubmissionInput, SubmissionStatus } from '@/lib/types';

const memoryStore = [...mockSubmissions];

function sortByCreatedDesc(items: Submission[]) {
  return [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function listSubmissions(status?: SubmissionStatus): Promise<Submission[]> {
  if (!status) {
    return sortByCreatedDesc(memoryStore);
  }
  return sortByCreatedDesc(memoryStore.filter((entry) => entry.status === status));
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const created: Submission = {
    id: `s-${crypto.randomUUID()}`,
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  memoryStore.unshift(created);
  return created;
}

export async function publishSubmission(id: string): Promise<Submission | null> {
  const entry = memoryStore.find((item) => item.id === id);
  if (!entry) {
    return null;
  }

  entry.status = 'published';
  return entry;
}
