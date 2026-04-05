export interface DraftInput {
  topic: string;
  discipline?: string;
  articleType?: string;
  language?: 'zh' | 'en';
  sectionCount?: number;
}

function buildSectionTitles(topic: string, language: 'zh' | 'en', sectionCount: number) {
  const zhDefaults = ['引言', '研究背景', '方法设计', '结果与分析', '讨论', '结论'];
  const enDefaults = ['Introduction', 'Background', 'Methodology', 'Results', 'Discussion', 'Conclusion'];
  const base = language === 'zh' ? zhDefaults : enDefaults;
  const items = base.slice(0, Math.max(3, Math.min(sectionCount, 8)));

  while (items.length < Math.max(3, Math.min(sectionCount, 8))) {
    const index = items.length + 1;
    items.push(language === 'zh' ? `扩展章节 ${index}` : `Extended Section ${index}`);
  }

  return items.map((title, index) => ({
    order: index + 1,
    title,
    notes:
      language === 'zh'
        ? `围绕“${topic}”给出本节关键论点、证据与至少一个可验证指标。`
        : `For "${topic}", include key claims, evidence, and at least one measurable indicator.`
  }));
}

export function buildLocalDraft(input: DraftInput) {
  const topic = input.topic.trim();
  const language = input.language ?? 'zh';
  const sectionCount = Math.max(3, Math.min(input.sectionCount ?? 6, 8));
  const sections = buildSectionTitles(topic, language, sectionCount);

  const abstract =
    language === 'zh'
      ? `本文围绕“${topic}”展开，提出问题定义、方法框架与评估路径。建议在后续写作中补充数据来源、实验设计与局限性分析。`
      : `This manuscript focuses on "${topic}", outlining problem framing, methodological approach, and evaluation strategy. Add data sources, experiment design, and limitations in full draft.`;

  const markdown = [
    `# ${topic}`,
    '',
    language === 'zh' ? '## 摘要（草稿）' : '## Abstract (Draft)',
    abstract,
    '',
    ...(language === 'zh' ? ['## 建议章节结构'] : ['## Recommended Structure']),
    ...sections.flatMap((section) => [`### ${section.order}. ${section.title}`, section.notes, ''])
  ].join('\n');

  return {
    mode: 'local-template' as const,
    abstract,
    sections,
    markdown
  };
}
