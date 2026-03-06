export type SubmissionStatus = 'pending' | 'published';

export interface Submission {
  id: string;
  title: string;
  journal: string;
  category: string;
  review: string;
  fileUrl: string;
  status: SubmissionStatus;
  createdAt: string;
}

export interface SubmissionInput {
  title: string;
  journal: string;
  category: string;
  review: string;
  fileUrl: string;
}
