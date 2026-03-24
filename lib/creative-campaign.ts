import { SiteLang } from '@/lib/site-copy';
import { SubmissionTrack } from '@/lib/submission-track';

export type CampaignTheme = {
  slug: 'researcher-day' | 'complex-to-user' | 'ai-writing-governance' | 'ai-data-verification';
  track: SubmissionTrack;
  title: Record<SiteLang, string>;
  summary: Record<SiteLang, string>;
  cta: Record<SiteLang, string>;
};
export type CreativeCampaignTheme = CampaignTheme;

export const CREATIVE_CAMPAIGN_MANIFESTO: Record<SiteLang, string> = {
  zh: '每次实验的失败，都是对正确结论边界的规划；每一次从头再来的努力，都是对创新的向往。我们是增量发现。',
  en: 'Every failed experiment maps the boundary of a correct conclusion; every restart reflects our desire for innovation. We are Incremental Findings.'
};

export const ACADEMIC_CAMPAIGN_MANIFESTO: Record<SiteLang, string> = {
  zh: '我们接受 AI 写作，但必须把幻觉风险、证据链一致性与数据核查作为学术底线。',
  en: 'We accept AI-assisted writing, but hallucination risk, evidence consistency, and data verification must remain non-negotiable.'
};

export const CAMPAIGN_THEMES: CampaignTheme[] = [
  {
    slug: 'researcher-day',
    track: 'entertainment',
    title: {
      zh: '主题一：研究者的一天',
      en: 'Theme 1: A Day in the Life of a Researcher'
    },
    summary: {
      zh: '记录真实研究过程：失败、重试、转向、灵感与最终选择。',
      en: 'Capture the real research process: failures, retries, pivots, insights, and final decisions.'
    },
    cta: {
      zh: '投稿「研究者的一天」',
      en: 'Submit to “A Day in the Life of a Researcher”'
    }
  },
  {
    slug: 'complex-to-user',
    track: 'entertainment',
    title: {
      zh: '主题二：把复杂研究讲给真正的使用者',
      en: 'Theme 2: Explain Complex Research to Real Users'
    },
    summary: {
      zh: '把学术语言翻译成可理解、可使用、可传播的公共表达。',
      en: 'Translate academic complexity into understandable, usable, and shareable language for real users.'
    },
    cta: {
      zh: '投稿「讲给真正的使用者」',
      en: 'Submit to “Explain to Real Users”'
    }
  },
  {
    slug: 'ai-writing-governance',
    track: 'academic',
    title: {
      zh: '主题一：AI 写作治理与幻觉边界',
      en: 'Theme 1: AI Writing Governance & Hallucination Boundaries'
    },
    summary: {
      zh: '聚焦 AI 辅助写作的可追溯性：引用一致性、事实核验、模型使用披露与责任界定。',
      en: 'Focus on traceable AI-assisted writing: citation consistency, factual verification, model-use disclosure, and accountability.'
    },
    cta: {
      zh: '投稿「AI 写作治理」',
      en: 'Submit to “AI Writing Governance”'
    }
  },
  {
    slug: 'ai-data-verification',
    track: 'academic',
    title: {
      zh: '主题二：AI 论文的数据核查与检测',
      en: 'Theme 2: Data Verification & Detection for AI Papers'
    },
    summary: {
      zh: '围绕数据来源、处理流程、复现实验与异常检测，构建可审计的数据核查框架。',
      en: 'Build auditable verification frameworks around data origin, processing pipelines, reproducibility, and anomaly detection.'
    },
    cta: {
      zh: '投稿「AI 数据核查」',
      en: 'Submit to “AI Data Verification”'
    }
  }
];

export const CREATIVE_CAMPAIGN_THEMES = CAMPAIGN_THEMES.filter((item) => item.track === 'entertainment');
export const ACADEMIC_CAMPAIGN_THEMES = CAMPAIGN_THEMES.filter((item) => item.track === 'academic');

export function getCampaignThemes(track: SubmissionTrack) {
  return CAMPAIGN_THEMES.filter((item) => item.track === track);
}

export function getCampaignManifesto(track: SubmissionTrack, lang: SiteLang) {
  return track === 'academic' ? ACADEMIC_CAMPAIGN_MANIFESTO[lang] : CREATIVE_CAMPAIGN_MANIFESTO[lang];
}

export function isCampaignTheme(value: string | null | undefined): value is CampaignTheme['slug'] {
  return value === 'researcher-day' || value === 'complex-to-user' || value === 'ai-writing-governance' || value === 'ai-data-verification';
}

export const isCreativeCampaignTheme = isCampaignTheme;
