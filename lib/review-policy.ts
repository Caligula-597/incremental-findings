export type ReviewModel = 'single_blind' | 'double_blind';

export interface ReviewPolicyConfig {
  model: ReviewModel;
  requireCoiDisclosure: boolean;
  enforceReviewerAuthorSeparation: boolean;
  defaultReviewDueDays: number;
}

export function getReviewPolicyConfig(): ReviewPolicyConfig {
  const model = (process.env.REVIEW_MODEL ?? 'single_blind').toLowerCase();
  return {
    model: model === 'double_blind' ? 'double_blind' : 'single_blind',
    requireCoiDisclosure: (process.env.REQUIRE_COI_DISCLOSURE ?? 'true').toLowerCase() !== 'false',
    enforceReviewerAuthorSeparation: (process.env.ENFORCE_REVIEWER_AUTHOR_SEPARATION ?? 'true').toLowerCase() !== 'false',
    defaultReviewDueDays: Number(process.env.DEFAULT_REVIEW_DUE_DAYS ?? '21') || 21
  };
}

export function reviewerConflictsWithAuthors(reviewerEmail: string, authorsRaw: string) {
  const normalizedReviewer = reviewerEmail.trim().toLowerCase();
  const normalizedAuthors = authorsRaw.toLowerCase();
  return normalizedAuthors.includes(normalizedReviewer);
}
