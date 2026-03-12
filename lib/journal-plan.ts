export const JOURNAL_POSITIONING = {
  name: 'Incremental Findings',
  mission: {
    zh: '发表严谨的增量研究、重复研究与阴性结果，提升科学证据的可复现性、可累积性与公共可理解性。',
    en: 'Publish rigorous incremental studies, replications, and negative results to improve reproducibility, cumulative evidence, and public intelligibility of science.'
  },
  missionExtended: {
    zh: [
      '我们优先支持“能减少不确定性”的工作：哪怕只是对已知结论做出边界修正、条件澄清或失败复现，也属于高价值学术贡献。',
      '我们拒绝“只报喜不报忧”的发表偏倚，明确鼓励阴性结果、未达显著但设计严谨的研究，以及可复现实验记录。',
      '我们要求关键方法与数据描述具备可核查性，推动研究从“可发表”转向“可验证、可复用、可追责”。',
      '我们坚持双重受众：既服务专业研究者的技术深度，也提供面向公众的通俗证据摘要。'
    ],
    en: [
      'We prioritize work that reduces uncertainty: boundary refinements, condition clarifications, and failed replications are all considered high-value contributions.',
      'We actively counter publication bias by welcoming negative results, null-yet-rigorous studies, and reproducible experiment logs.',
      'We require verifiable methods and data descriptions, shifting from “publishable” to “auditable, reusable, and accountable.”',
      'We serve two audiences at once: technical depth for researchers and plain-language evidence summaries for the public.'
    ]
  },
  pillars: {
    zh: ['增量贡献优先', '重复与阴性结果友好', '方法与流程透明', '编辑决策可审计', '双语与公众可达'],
    en: ['Incremental-value first', 'Replication/negative-result friendly', 'Method/process transparency', 'Auditable editorial decisions', 'Bilingual public accessibility']
  },
  audience: {
    zh: ['研究者', '研究生与早期学者', '开源与公民科学社群', '公共政策与公益组织'],
    en: ['Researchers', 'Graduate and early-career scholars', 'Open-science and citizen-science communities', 'Public-interest and policy organizations']
  }
} as const;

export const JOURNAL_PUBLIC_PROGRAMS = {
  zh: [
    {
      title: '人人可读的方法摘要',
      description: '要求投稿提供通俗方法说明，让非专业读者理解证据如何产生。'
    },
    {
      title: '重复研究与阴性结果专轨',
      description: '对重复研究和阴性结果给予明确通道与编辑优先级，减少发表偏倚。'
    },
    {
      title: '社区证据短文',
      description: '接受实践者与公共实验室提交的证据短文，在编辑质控后公开发布。'
    }
  ],
  en: [
    {
      title: 'Open methods for everyone',
      description: 'Require plain-language methods summaries so non-specialists can follow how evidence was produced.'
    },
    {
      title: 'Replication & negative-results track',
      description: 'Provide explicit editorial priority for replications and negative findings to reduce publication bias.'
    },
    {
      title: 'Community evidence notes',
      description: 'Invite concise evidence notes from practitioners and public labs under editorial quality checks.'
    }
  ]
} as const;
