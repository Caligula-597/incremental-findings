import { createHash } from 'crypto';
import { DoiRegistrationResult, Submission } from '@/lib/types';

function sanitize(value: string) {
  return value.trim().replace(/^https?:\/\/doi\.org\//i, '').replace(/\/+$|\s+/g, '');
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function isResolvableDoi(value: string | null | undefined) {
  if (!value) return false;
  const normalized = sanitize(value);
  return /^10\./.test(normalized);
}

export function buildDoiForSubmission(submission: Submission): DoiRegistrationResult {
  const placeholderPrefix = slug(process.env.DOI_PLACEHOLDER_PREFIX ?? 'if-tmp');
  const registrant = slug(process.env.DOI_REGISTRANT ?? 'incremental-findings');
  const idHash = createHash('sha1').update(`${submission.id}:${submission.created_at}`).digest('hex').slice(0, 12);
  const titlePart = slug(submission.title) || 'untitled';
  const registeredAt = new Date().toISOString();

  // Temporary non-DOI publication identifier until real provider integration is enabled.
  // Example: IFTMP:incremental-findings:graph-neural-networks:2d5a0c48aa11
  const placeholderId = `${placeholderPrefix}:${registrant}:${titlePart}:${idHash}`;

  return {
    submission_id: submission.id,
    doi: placeholderId,
    registered_at: registeredAt,
    provider: 'internal-placeholder'
  };
}
