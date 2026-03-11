export interface JournalStandardSection {
  id: string;
  title: string;
  objective: string;
  implementedNow: string[];
  rolloutNext: string[];
  acceptanceCriteria: string[];
}

export const JOURNAL_STANDARDS: JournalStandardSection[] = [
  {
    id: 'peer-review-governance',
    title: '审查制度（Peer Review Governance）',
    objective: '建立可追踪、可复核、可审计的审稿流程，支持编辑部合规操作。',
    implementedNow: [
      '已具备审稿邀请、接受/拒绝、提交审稿报告、编辑终审的 API 基线。',
      '审稿分配与报告结构化入库，支持后续统计与审计扩展。'
    ],
    rolloutNext: [
      '补齐单盲/双盲配置与匿名化文件投递策略。',
      '增加利益冲突（COI）声明和审稿人资质标签。',
      '增加逾期提醒和自动升级规则。'
    ],
    acceptanceCriteria: [
      '每篇稿件可追踪完整审稿链路（邀请->响应->报告->决定）。',
      '盲审配置可在期刊级别开启并可审计。',
      '审稿 SLA 指标可查询（响应时长、完成时长、逾期率）。'
    ]
  },
  {
    id: 'publication-ethics',
    title: '出版伦理流程（Publication Ethics）',
    objective: '以可执行流程覆盖作者声明、伦理合规、撤稿/更正与争议处理。',
    implementedNow: [
      '投稿流程已收集作者保证、原创性声明、伦理声明与隐私确认。',
      '已落地审计日志基线，可追踪关键变更行为。'
    ],
    rolloutNext: [
      '增加撤稿（Retraction）、更正（Correction）、表达关注（Expression of Concern）流程。',
      '增加伦理争议工单化处置和责任人审批链。',
      '发布公开伦理政策页（COPE 对齐版本）。'
    ],
    acceptanceCriteria: [
      '每个伦理事件都可关联处理状态、决策人和时间线。',
      '对外可公开查看伦理政策与修订历史。',
      '高风险稿件可强制二次审查/法务复核。'
    ]
  },
  {
    id: 'quality-verification-system',
    title: '验证质量体系（Verification & QA）',
    objective: '用自动化与运行监控降低回归风险，建立发布质量门禁。',
    implementedNow: [
      '已具备 lint/typecheck/build 基础校验。',
      '已具备运行模式/集成状态诊断 API。'
    ],
    rolloutNext: [
      '补充 API 合约测试（auth/orcid/submission/review 核心链路）。',
      '增加 E2E 冒烟（登录->投稿->编辑决定->公开检索）。',
      '在 CI 增加 migration dry-run 与 RLS policy 校验。'
    ],
    acceptanceCriteria: [
      '主干分支合并前必须通过 lint+typecheck+api smoke。',
      '发布后关键错误率可观测并触发告警。',
      '数据库 migration 每次发布可重复验证。'
    ]
  },
  {
    id: 'metadata-standardization',
    title: '元数据标准化处理（Metadata Standardization）',
    objective: '确保稿件元数据在内部一致，并可向外部索引系统稳定投递。',
    implementedNow: [
      '已支持 BibTeX/RIS/CSL-JSON 导出基线。',
      '已具备索引导出队列与元数据快照结构。'
    ],
    rolloutNext: [
      '补齐 JATS XML 与 Crossref/DataCite schema 映射。',
      '引入作者机构/ROR/ORCID 规范化字段。',
      '建立 metadata 版本化与幂等重投机制。'
    ],
    acceptanceCriteria: [
      '同一篇稿件在各格式导出字段一致且可追溯。',
      '外部 provider 回执可关联到本地 submission 与版本。',
      '元数据导出失败可重试且不重复污染。'
    ]
  }
];

export function getJournalStandardsSummary() {
  return {
    totalSections: JOURNAL_STANDARDS.length,
    implementedSignals: JOURNAL_STANDARDS.reduce((n, item) => n + item.implementedNow.length, 0),
    rolloutSignals: JOURNAL_STANDARDS.reduce((n, item) => n + item.rolloutNext.length, 0)
  };
}
