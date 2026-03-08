export type FeatureModule = {
  id: string;
  module: string;
  goal: string;
  currentState: 'missing' | 'partial' | 'ready';
  priority: 'p0' | 'p1' | 'p2';
  requiredApis: string[];
  dataContracts: string[];
  nextMilestone: string;
};

export const FEATURE_ROADMAP: FeatureModule[] = [];


export const COMPLETED_FOUNDATION_ITEMS = [
  'Notification system baseline: templates + preview + send queue APIs',
  'Submission versioning baseline: create/list revision history APIs',
  'Peer review lifecycle baseline: assign/respond/report/decision APIs',
  'Production pipeline baseline: start/proof/publish package APIs',
  'Security anti-abuse baseline: risk-check/events/block APIs',
  'Indexing export baseline: RIS/CSL + export queue APIs'
];

export function getRoadmapSummary() {
  return {
    total: FEATURE_ROADMAP.length,
    missing: FEATURE_ROADMAP.filter((item) => item.currentState === 'missing').length,
    partial: FEATURE_ROADMAP.filter((item) => item.currentState === 'partial').length,
    ready: FEATURE_ROADMAP.filter((item) => item.currentState === 'ready').length,
    p0: FEATURE_ROADMAP.filter((item) => item.priority === 'p0').length
  };
}
