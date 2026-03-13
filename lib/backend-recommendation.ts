import { getSupabaseServerClient } from '@/lib/supabase';

export interface BackendOption {
  id: string;
  fitForStage: 'now' | 'next' | 'later';
  name: string;
  pros: string[];
  tradeoffs: string[];
  recommendedFor: string;
}

export const BACKEND_OPTIONS: BackendOption[] = [
  {
    id: 'supabase-postgres-storage',
    fitForStage: 'now',
    name: 'Supabase (Postgres + Storage + Auth-adjacent table model)',
    pros: [
      '与你当前代码兼容度最高，已有 client/fallback 结构。',
      '可同时解决结构化数据与文件存储（papers bucket）。',
      '迁移成本最低，能最快从 demo 走向可持续环境。'
    ],
    tradeoffs: ['需要先补齐 schema 和 RLS 策略。', 'Provider lock-in 程度中等。'],
    recommendedFor: '当前阶段最优先接入。'
  },
  {
    id: 'postgres-prisma-object-storage',
    fitForStage: 'next',
    name: 'Managed Postgres + Prisma + S3/R2',
    pros: ['平台中立，迁移灵活。', '可细化审稿/版本化数据模型与事务。'],
    tradeoffs: ['实施成本高于 Supabase 直连。', '对象存储签名/权限需要自行维护。'],
    recommendedFor: '当你需要更强控制和多云迁移能力时。'
  },
  {
    id: 'event-driven-modular',
    fitForStage: 'later',
    name: '事件驱动（队列 + 工作流）',
    pros: ['适合 DOI、索引导出、通知等异步链路。', '便于扩展可观测性与重试策略。'],
    tradeoffs: ['复杂度较高。', '需要先稳定核心事务模型。'],
    recommendedFor: '规模和吞吐上来之后再引入。'
  }
];

export function getBackendRecommendationSnapshot() {
  const supabase = getSupabaseServerClient();
  const supabaseConfigured = Boolean(supabase);

  return {
    preferredNow: 'supabase-postgres-storage',
    supabaseConfigured,
    immediateActions: [
      '优先落地 Supabase 表结构、索引、RLS 策略与 Storage bucket(papers)。',
      '将内存 fallback 保留为开发模式，但在生产环境强制要求数据库可用。',
      '为 submissions/auth/orcid/review 增加最小集成测试，确保迁移时不回归。'
    ],
    options: BACKEND_OPTIONS
  };
}
