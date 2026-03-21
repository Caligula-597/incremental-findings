import { SubmissionStatus } from '@/lib/types';

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  under_review: ['accepted', 'rejected'],
  accepted: ['in_production', 'under_review', 'rejected'],
  in_production: ['published'],
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
