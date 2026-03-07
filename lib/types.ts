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
  doi?: string | null;
  doi_registered_at?: string | null;
  author_id?: string | null;
  category?: string | null;
}

export interface SubmissionInput {
  title: string;
  authors?: string;
  abstract?: string;
  discipline?: string;
  topic?: string;
  article_type?: string;
  file_url?: string;
  author_id?: string;
  category?: string;
  doi?: string;
  doi_registered_at?: string;
}

export interface DoiRegistrationResult {
  submission_id: string;
  doi: string;
  registered_at: string;
  provider: 'mock' | 'crossref-ready';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface OrcidLink {
  user_email?: string;
  user_id?: string;
  orcid_id: string;
  verified: boolean;
  connected_at?: string;
  verified_at?: string;
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


export interface NotificationJobRecord {
  id: string;
  template: string;
  to: string;
  subject: string;
  renderedBody: string;
  provider: 'log-only' | 'resend-ready';
  status: 'queued' | 'sent' | 'failed';
  error?: string;
  actor_email: string;
  created_at: string;
}


export interface SubmissionVersionRecord {
  id: string;
  submission_id: string;
  version_index: number;
  status_snapshot: SubmissionStatus;
  file_url: string | null;
  revision_summary: string;
  actor_email: string;
  metadata_json?: string | null;
  created_at: string;
}
