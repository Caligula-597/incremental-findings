import { SiteLang } from '@/lib/site-copy';

export type CreativeCampaignTheme = {
  slug: 'researcher-day' | 'complex-to-user';
  title: Record<SiteLang, string>;
  summary: Record<SiteLang, string>;
  cta: Record<SiteLang, string>;
};

export const CREATIVE_CAMPAIGN_MANIFESTO: Record<SiteLang, string> = {
  zh: '每次实验的失败，都是对正确结论边界的规划；每一次从头再来的努力，都是对创新的向往。我们是增量发现。',
  en: 'Every failed experiment maps the boundary of a correct conclusion; every restart reflects our desire for innovation. We are Incremental Findings.'
};

export const CREATIVE_CAMPAIGN_THEMES: CreativeCampaignTheme[] = [
  {
    slug: 'researcher-day',
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
  }
];

export function isCreativeCampaignTheme(value: string | null | undefined): value is CreativeCampaignTheme['slug'] {
  return value === 'researcher-day' || value === 'complex-to-user';
}
