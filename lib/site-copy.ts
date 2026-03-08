export type SiteLang = 'zh' | 'en';

export const SITE_COPY = {
  zh: {
    siteName: 'Incremental Findings 增量发现',
    tagline: '独立研究档案 · 面向可复现证据与高质量编辑流程',
    nav: {
      home: '首页',
      submit: '投稿',
      community: '使命与计划',
      editor: '编辑部',
      account: '账户',
      login: '登录',
      logout: '退出登录'
    },
    home: {
      title: '发现可复现的增量研究',
      subtitle: '按学科与稿件类型筛选，快速浏览高信号论文。',
      allDisciplines: '全部学科',
      allTypes: '全部类型',
      clearFilters: '清空筛选',
      latestPublished: '最新发布',
      noPublishedTitle: '当前筛选下暂无已发布内容',
      noPublishedDesc: '目前仅展示已完成审稿并发布的稿件。你可以切换筛选，或直接提交新稿。',
      openArticle: '查看文章页',
      readPdf: '阅读 PDF',
      contributeTitle: '提交你的下一篇研究',
      contributeSubtitle: '根据你的当前阶段，选择合适入口。',
      startSubmission: '开始投稿',
      manageAccount: '管理账户与 ORCID',
      openEditor: '进入编辑部'
    },
    community: {
      title: '期刊使命与公开计划',
      subtitle: '面向群众、面向研究者、面向可复现证据：这是我们期刊的公开目标。'
    }
  },
  en: {
    siteName: 'Incremental Findings',
    tagline: 'Independent research archive · Reproducible evidence with strong editorial workflow',
    nav: {
      home: 'Home',
      submit: 'Submit',
      community: 'Mission & Plan',
      editor: 'Editorial',
      account: 'Account',
      login: 'Log in',
      logout: 'Log out'
    },
    home: {
      title: 'Discover reproducible incremental research',
      subtitle: 'Filter by discipline and article type to quickly browse high-signal papers.',
      allDisciplines: 'All disciplines',
      allTypes: 'All types',
      clearFilters: 'Clear filters',
      latestPublished: 'Latest published',
      noPublishedTitle: 'No published papers under this filter',
      noPublishedDesc: 'Only reviewed and published papers are shown. Try a different filter or submit a new manuscript.',
      openArticle: 'Open article page',
      readPdf: 'Read PDF',
      contributeTitle: 'Contribute your next finding',
      contributeSubtitle: 'Choose the right entry based on your current workflow stage.',
      startSubmission: 'Start a submission',
      manageAccount: 'Manage account & ORCID',
      openEditor: 'Open editorial workspace'
    },
    community: {
      title: 'Journal Mission & Public Plan',
      subtitle: 'For the public, for researchers, and for reproducible evidence: our open journal commitment.'
    }
  }
} as const;

export function getSiteLang(input?: string | null): SiteLang {
  return input === 'en' ? 'en' : 'zh';
}

export function getSiteCopy(lang?: string | null) {
  return SITE_COPY[getSiteLang(lang)];
}
