export type SubmissionStatus = 'under_review' | 'accepted' | 'in_production' | 'published' | 'rejected';

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
  submitter_email?: string | null;
  files?: SubmissionFileRecord[];
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
  submitter_email?: string;
  doi?: string;
  doi_registered_at?: string;
}

export interface DoiRegistrationResult {
  submission_id: string;
  doi: string;
  registered_at: string;
  provider: 'internal-placeholder' | 'crossref-ready';
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface EmailVerificationRecord {
  email: string;
  user_id?: string | null;
  code_hash: string;
  expires_at: string;
  sent_at: string;
  verified_at?: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
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


export interface ReviewAssignmentRecord {
  id: string;
  submission_id: string;
  reviewer_email: string;
  editor_email: string;
  round_index: number;
  status: 'invited' | 'accepted' | 'declined' | 'completed';
  due_at?: string | null;
  responded_at?: string | null;
  created_at: string;
}

export interface ReviewReportRecord {
  id: string;
  submission_id: string;
  assignment_id: string;
  reviewer_email: string;
  recommendation: 'accept' | 'minor_revision' | 'major_revision' | 'reject';
  summary: string;
  confidential_note?: string | null;
  created_at: string;
}

export interface EditorDecisionRecord {
  id: string;
  submission_id: string;
  decision: 'accept' | 'reject' | 'revise';
  mapped_status: SubmissionStatus;
  reason: string;
  editor_email: string;
  created_at: string;
}


export interface ProductionJobRecord {
  id: string;
  submission_id: string;
  stage: 'started' | 'proof_ready' | 'package_published';
  editor_email: string;
  note?: string | null;
  created_at: string;
}

export interface PublicationPackageRecord {
  id: string;
  submission_id: string;
  package_url: string;
  checksum?: string | null;
  editor_email: string;
  created_at: string;
}


export interface SecurityEventRecord {
  id: string;
  kind: 'risk_check' | 'blocked' | 'alert';
  actor_email?: string | null;
  ip?: string | null;
  route?: string | null;
  detail: string;
  risk_score?: number | null;
  created_at: string;
}

export interface RiskScoreRecord {
  id: string;
  ip: string;
  route: string;
  score: number;
  decision: 'allow' | 'challenge' | 'block';
  reasons: string[];
  created_at: string;
}

export interface IpRateLimitRecord {
  id: string;
  ip: string;
  route: string;
  blocked_until: string;
  reason: string;
  created_at: string;
}


export interface IndexingExportRecord {
  id: string;
  submission_id: string;
  provider: string;
  payload_json: string;
  status: 'queued' | 'sent' | 'failed';
  actor_email: string;
  created_at: string;
}

export interface MetadataSnapshotRecord {
  id: string;
  submission_id: string;
  format: 'bibtex' | 'ris' | 'csl-json' | 'jats';
  content: string;
  created_at: string;
}


export interface EthicsCaseRecord {
  id: string;
  submission_id: string;
  case_type: 'retraction' | 'correction' | 'expression_of_concern' | 'ethics_inquiry';
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  summary: string;
  reporter_email: string;
  owner_email?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
}


export interface EditorApplicationRecord {
  id: string;
  applicant_email: string;
  applicant_name: string;
  statement: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewed_by_email?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditorInviteRecord {
  id: string;
  applicant_email: string;
  invite_code: string;
  invited_by_email: string;
  application_id?: string | null;
  status: 'active' | 'used' | 'revoked' | 'expired';
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}
