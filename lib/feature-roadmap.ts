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

export const FEATURE_ROADMAP: FeatureModule[] = [
  {
    id: 'review-lifecycle',
    module: 'Peer Review Lifecycle',
    goal: '支持送审、审稿人分配、意见回收、轮次管理、终审决策。',
    currentState: 'missing',
    priority: 'p0',
    requiredApis: [
      'POST /api/reviews/assign',
      'POST /api/reviews/invitations/:id/respond',
      'POST /api/reviews/:id/submit-report',
      'POST /api/submissions/:id/decision'
    ],
    dataContracts: ['review_rounds', 'review_assignments', 'review_reports', 'editor_decisions'],
    nextMilestone: '先实现编辑端分配审稿人与意见汇总，再做多轮修回流程。'
  },
  {
    id: 'versioning',
    module: 'Submission Versioning',
    goal: '论文修订版本可追踪、可比对、可回滚。',
    currentState: 'partial',
    priority: 'p0',
    requiredApis: ['POST /api/submissions/:id/revisions', 'GET /api/submissions/:id/revisions'],
    dataContracts: ['submission_versions', 'version_files', 'change_log_entries'],
    nextMilestone: '在现有 complete 上传基础上抽象版本层，建立 v1/v2/v3 关系。'
  },
  {
    id: 'production-pipeline',
    module: 'Production & Publication',
    goal: '录用后进入排版、校对、上线与 DOI 注册回执链路。',
    currentState: 'partial',
    priority: 'p1',
    requiredApis: [
      'POST /api/production/:id/start',
      'POST /api/production/:id/proof',
      'POST /api/production/:id/publish-package'
    ],
    dataContracts: ['production_jobs', 'proof_tasks', 'publication_packages'],
    nextMilestone: '把 publish + doi 从单步骤拆成可追踪的生产流水线。'
  },
  {
    id: 'anti-abuse',
    module: 'Security & Anti-abuse',
    goal: '对注册、登录、投稿接口做风控、速率控制和审计增强。',
    currentState: 'partial',
    priority: 'p1',
    requiredApis: [
      'POST /api/security/risk-check',
      'GET /api/security/events',
      'POST /api/security/block'
    ],
    dataContracts: ['security_events', 'risk_scores', 'ip_rate_limits'],
    nextMilestone: '先加中间件级限流和异常登录告警，再做风险评分。'
  },
  {
    id: 'indexing-export',
    module: 'Indexing & Metadata Export',
    goal: '向 Crossref / DOAJ / 学术索引平台导出标准元数据。',
    currentState: 'partial',
    priority: 'p1',
    requiredApis: [
      'GET /api/public/submissions/:id/citation?format=ris',
      'GET /api/public/submissions/:id/citation?format=csl-json',
      'POST /api/indexing/export/:provider'
    ],
    dataContracts: ['indexing_exports', 'metadata_snapshots'],
    nextMilestone: '在现有 bibtex 基础上加 RIS/CSL JSON + export 任务队列。'
  }
];


export const COMPLETED_FOUNDATION_ITEMS = [
  'Notification system baseline: templates + preview + send queue APIs',
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
