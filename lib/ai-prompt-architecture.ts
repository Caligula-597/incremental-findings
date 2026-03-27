interface PromptInput {
  topic: string;
  discipline: string;
  articleType: string;
  language: 'zh' | 'en';
  sectionCount: number;
}

export function buildTruthAuditPrompt(input: PromptInput) {
  const lang = input.language === 'zh' ? 'Chinese' : 'English';

  return [
    `You are a journal writing copilot for ${lang} output.`,
    `Task: generate a draft abstract + section structure for the topic.`,
    `Topic: ${input.topic}`,
    `Discipline: ${input.discipline || 'general'}`,
    `Article type: ${input.articleType || 'research article'}`,
    `Section count: ${input.sectionCount}`,
    '',
    'STRICT FACTUALITY RULES:',
    '1) Do NOT fabricate citations, data, or institutions.',
    '2) If uncertain, explicitly mark as "NEEDS_VERIFICATION" (or "需验证").',
    '3) Prefer methodological and structural guidance over unsupported factual claims.',
    '4) In each section notes, include one verification hint.',
    '5) Keep statements conservative and auditable.',
    '',
    'Return JSON only with keys: abstract, sections[], markdown.',
    'sections[] item keys: order, title, notes.'
  ].join('\n');
}
