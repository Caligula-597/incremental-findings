export interface ProfessionalizationItem {
  id: string;
  module: string;
  currentState: 'implemented' | 'baseline' | 'partial' | 'missing';
  priority: 'p0' | 'p1' | 'p2';
  whyItMatters: string;
  nextActions: string[];
  successCriteria: string[];
}

export const PROFESSIONALIZATION_PLAN: ProfessionalizationItem[] = [
  {
    id: 'i18n-coverage',
    module: 'Bilingual UX (zh/en) full coverage',
    currentState: 'partial',
    priority: 'p0',
    whyItMatters: 'Current language switch is available, but copy coverage is incomplete across modules.',
    nextActions: [
      'Move remaining hard-coded strings from submit/login/account/editor/paper-detail into shared copy dictionary.',
      'Add one helper utility for language-preserving links to avoid parameter drift.',
      'Add smoke tests for lang=zh and lang=en key pages.'
    ],
    successCriteria: [
      'No user-facing hardcoded Chinese/English strings in core pages except data content.',
      'All top-level navigation and CTA links preserve language context.',
      'Basic automated checks cover bilingual rendering regressions.'
    ]
  },
  {
    id: 'performance-hardening',
    module: 'Runtime performance and perceived speed',
    currentState: 'baseline',
    priority: 'p0',
    whyItMatters: 'User-reported lag exists in run-time experience; baseline optimizations are present but not systematic.',
    nextActions: [
      'Profile largest routes and split non-critical server data blocks.',
      'Introduce pagination and selective loading for editorial lists.',
      'Track key web vitals and add alert thresholds for regressions.'
    ],
    successCriteria: [
      'Largest route first-load JS stays within agreed budget.',
      'No blocking client fetch in header/nav critical path beyond timeout-safe check.',
      'Perf hints endpoint aligns with measured metrics rather than static advice only.'
    ]
  },
  {
    id: 'quality-assurance',
    module: 'Automated testing and quality gates',
    currentState: 'missing',
    priority: 'p0',
    whyItMatters: 'Current scaffold has no enforced tests or lint gating, which increases regression risk.',
    nextActions: [
      'Add ESLint config and make lint non-interactive in CI/local checks.',
      'Add API route integration tests for auth/submission/review happy path.',
      'Add smoke E2E for home -> login -> submit entry flows.'
    ],
    successCriteria: [
      'npm run lint and npm test run non-interactively.',
      'Critical APIs have stable contract tests with fixtures.',
      'At least one CI-ready quality gate prevents broken merges.'
    ]
  },
  {
    id: 'security-compliance',
    module: 'Security/compliance hardening',
    currentState: 'baseline',
    priority: 'p1',
    whyItMatters: 'Risk-check and session baseline exist, but production-grade controls need stronger enforcement and observability.',
    nextActions: [
      'Add route-level authorization policy matrix and deny-by-default checks.',
      'Add structured audit event schema and retention policy.',
      'Introduce secret/config validation at process boot.'
    ],
    successCriteria: [
      'All privileged routes map to explicit role policies.',
      'Security events are queryable with stable fields and timestamps.',
      'Invalid/missing critical env fails fast with actionable errors.'
    ]
  },
  {
    id: 'external-integrations',
    module: 'Production provider integrations',
    currentState: 'partial',
    priority: 'p1',
    whyItMatters: 'ORCID/DOI/indexing are scaffolded, but many providers are still mock/log-only.',
    nextActions: [
      'Implement provider adapters with clear retry/error strategy.',
      'Add signed webhook/event handling where providers require callbacks.',
      'Add integration test stubs and sandbox credential docs.'
    ],
    successCriteria: [
      'Provider mode is explicit per environment (mock/sandbox/live).',
      'Failures are recoverable and visible through diagnostics endpoints.',
      'Core metadata sync supports idempotent retries.'
    ]
  }
];

export function getProfessionalizationSummary() {
  const counters = {
    implemented: 0,
    baseline: 0,
    partial: 0,
    missing: 0,
    p0: 0,
    p1: 0,
    p2: 0
  };

  for (const item of PROFESSIONALIZATION_PLAN) {
    counters[item.currentState] += 1;
    counters[item.priority] += 1;
  }

  return counters;
}
