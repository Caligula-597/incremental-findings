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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface OrcidLink {
  user_email: string;
  orcid_id: string;
  verified: boolean;
  connected_at: string;
}

export interface ConsentPayload {
  author_warranty: boolean;
  originality_warranty: boolean;
  ethics_warranty: boolean;
  privacy_ack: boolean;
  terms_version: string;
}

export interface SubmissionFileRecord {
  id: string;
  submission_id: string;
  file_kind: 'manuscript' | 'cover_letter' | 'supporting';
  file_name: string;
  file_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  submission_id: string;
  action: string;
  actor_email: string;
  detail: string;
  created_at: string;
}
