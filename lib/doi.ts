import { createHash } from 'crypto';
import { DoiRegistrationResult, Submission } from '@/lib/types';

function sanitizeDoiPrefix(value: string) {
  return value.trim().replace(/^https?:\/\/doi\.org\//i, '').replace(/\/+$/, '');
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function buildDoiForSubmission(submission: Submission): DoiRegistrationResult {
  const prefix = sanitizeDoiPrefix(process.env.DOI_PREFIX ?? '10.5555');
  const registrant = slug(process.env.DOI_REGISTRANT ?? 'incremental-findings');
  const idHash = createHash('sha1').update(`${submission.id}:${submission.created_at}`).digest('hex').slice(0, 8);
  const titlePart = slug(submission.title) || 'untitled';
  const suffix = `${registrant}.${titlePart}.${idHash}`;
  const registeredAt = new Date().toISOString();

  return {
    submission_id: submission.id,
    doi: `${prefix}/${suffix}`,
    registered_at: registeredAt,
    provider: process.env.CROSSREF_API_BASE ? 'crossref-ready' : 'mock'
  };
}
