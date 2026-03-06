export const TERMS_VERSION = '2026-03-IF-v1';

export const AUTHOR_AGREEMENT_ITEMS = [
  'I confirm I have authorization from all co-authors to submit this manuscript.',
  'I confirm the submission is original, non-infringing, and properly cites third-party material.',
  'I confirm ethics and compliance obligations have been met for this work.',
  'I agree to the platform terms, privacy notice, and processing of submission data.'
] as const;

export const AUTHOR_PROTOCOL_BLOCKS = [
  {
    title: 'Authorship responsibility',
    points: [
      'Corresponding author must have explicit consent from every listed co-author before upload.',
      'Contributor order and institutional affiliation should match the manuscript front page and metadata.'
    ]
  },
  {
    title: 'Originality and citation policy',
    points: [
      'Any reused figures, data tables, or text must include source attribution and permission status.',
      'Parallel submissions to other venues must be transparently disclosed in the cover letter.'
    ]
  },
  {
    title: 'Ethics and data compliance',
    points: [
      'Human/animal research must include ethics approval context when applicable.',
      'Sensitive data should be anonymized or legally shareable before supporting files are uploaded.'
    ]
  }
] as const;
