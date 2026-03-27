import { NextResponse } from 'next/server';
import { generateStructuredDraftByProvider } from '@/lib/ai-provider-client';
import { buildLocalDraft } from '@/lib/writing-assistant';
import { buildTruthAuditPrompt } from '@/lib/ai-prompt-architecture';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';

interface DraftRequestBody {
  topic?: string;
  discipline?: string;
  article_type?: string;
  language?: 'zh' | 'en';
  section_count?: number;
  provider?: Provider;
  api_key?: string;
  model?: string;
}


export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DraftRequestBody;
    const topic = String(body.topic ?? '').trim();
    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const language: 'zh' | 'en' = body.language === 'en' ? 'en' : 'zh';
    const normalized = {
      topic,
      discipline: String(body.discipline ?? '').trim(),
      article_type: String(body.article_type ?? '').trim(),
      language,
      section_count: Math.max(3, Math.min(Number(body.section_count ?? 6) || 6, 8))
    };

    const provider = (body.provider ?? 'openai') as Provider;
    const apiKey = String(body.api_key ?? process.env.OPENAI_API_KEY ?? '').trim();
    const model = String(body.model ?? process.env.OPENAI_DRAFT_MODEL ?? '').trim();

    if (apiKey) {
      const structured = await generateStructuredDraftByProvider({
        provider,
        apiKey,
        model: model || undefined,
        prompt: buildTruthAuditPrompt({
          topic: normalized.topic,
          discipline: normalized.discipline,
          articleType: normalized.article_type,
          language: normalized.language,
          sectionCount: normalized.section_count
        })
      });

      if (structured && typeof structured === 'object') {
        const parsed = structured as {
          abstract?: string;
          sections?: Array<{ order: number; title: string; notes: string }>;
          markdown?: string;
        };

        if (parsed.abstract && Array.isArray(parsed.sections) && parsed.markdown) {
          return NextResponse.json({ data: { mode: `model:${provider}` as const, ...parsed } });
        }
      }
    }

    const local = buildLocalDraft({
      topic: normalized.topic,
      discipline: normalized.discipline,
      articleType: normalized.article_type,
      language: normalized.language,
      sectionCount: normalized.section_count
    });

    return NextResponse.json({ data: local });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
