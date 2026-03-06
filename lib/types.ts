export type SubmissionStatus = 'pending' | 'under_review' | 'published' | 'rejected';

export interface Submission {
  id: string;
  title: string;
  authors: string;
  abstract: string | null;
  discipline: string | null;
  topic: string | null;
  article_type: string | null;
  status: SubmissionStatus;
  file_url: string | null;
  created_at: string;
}

export interface SubmissionInput {
  title: string;
  authors: string;
  abstract?: string;
  discipline?: string;
  topic?: string;
  article_type?: string;
  file_url?: string;
}
