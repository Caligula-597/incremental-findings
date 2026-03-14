import { SubmissionStatus } from '@/lib/types';

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  pending: ['under_review', 'rejected'],
  under_review: ['published', 'rejected', 'pending'],
  published: [],
  rejected: []
};

export function canTransitionStatus(from: SubmissionStatus, to: SubmissionStatus) {
  if (from === to) {
    return true;
  }

  return transitions[from]?.includes(to) ?? false;
}

export function requiresDecisionReason(status: SubmissionStatus) {
  return status === 'rejected';
}
