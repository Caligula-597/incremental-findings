export type SubmissionStatus = 'pending' | 'under_review' | 'published' | 'rejected';

export interface Submission {
  id: string;
  title: string;
  authors: string;
  abstract: string | null;
  status: SubmissionStatus;
  file_url: string | null;
  created_at: string;
}

export interface SubmissionInput {
  title: string;
  authors: string;
  abstract?: string;
  file_url?: string;
}
