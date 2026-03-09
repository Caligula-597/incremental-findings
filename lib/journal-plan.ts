export const JOURNAL_POSITIONING = {
  name: 'Incremental Findings',
  mission:
    'Publish rigorous incremental research, null findings, and replication evidence that improves reliability of science for both specialists and the public.',
  audience: ['Researchers', 'Students', 'Citizen scientists', 'Public-interest organizations']
} as const;

export const JOURNAL_PUBLIC_PROGRAMS = [
  {
    title: 'Open Methods for Everyone',
    description: 'Require a plain-language methods summary so non-specialists can understand how evidence was produced.'
  },
  {
    title: 'Replication Track',
    description: 'Priority handling for replication and negative-result studies to reduce publication bias.'
  },
  {
    title: 'Community Evidence Notes',
    description: 'Invite concise evidence notes from practitioners and public labs under editorial quality checks.'
  }
] as const;

export const JOURNAL_2026_TARGETS = [
  'Publish first 120 reviewed articles with at least 30% replication/negative-result content.',
  'Keep median editorial triage under 7 days and first decision under 35 days.',
  'Provide DOI assignment for 100% of accepted articles and public metadata exports.',
  'Launch bilingual plain-language summaries for top public-interest submissions.'
] as const;
