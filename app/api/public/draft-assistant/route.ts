import { NextResponse } from 'next/server';
import { buildLocalDraft } from '@/lib/writing-assistant';

interface DraftRequestBody {
  topic?: string;
  discipline?: string;
  article_type?: string;
  language?: 'zh' | 'en';
  section_count?: number;
}

function buildPrompt(input: Required<Pick<DraftRequestBody, 'topic' | 'discipline' | 'article_type' | 'language'>> & { section_count: number }) {
  const lang = input.language === 'zh' ? 'Chinese' : 'English';
  return [
    `You are a journal writing copilot.`,
    `Return JSON with keys: abstract, sections[], markdown.`,
    `Topic: ${input.topic}`,
    `Discipline: ${input.discipline || 'general'}`,
    `Article type: ${input.article_type || 'research article'}`,
    `Language: ${lang}`,
    `Section count: ${input.section_count}`,
    `For sections[], include fields: order, title, notes.`
  ].join('\n');
}

async function generateByModel(body: Required<Pick<DraftRequestBody, 'topic' | 'discipline' | 'article_type' | 'language'>> & { section_count: number }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_DRAFT_MODEL ?? 'gpt-4.1-mini';

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(body),
      text: {
        format: {
          type: 'json_schema',
          name: 'draft_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              abstract: { type: 'string' },
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    order: { type: 'integer' },
                    title: { type: 'string' },
                    notes: { type: 'string' }
                  },
                  required: ['order', 'title', 'notes']
                }
              },
              markdown: { type: 'string' }
            },
            required: ['abstract', 'sections', 'markdown']
          }
        }
      }
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as { output_text?: string } | null;
  if (!payload?.output_text) {
    return null;
  }

  const parsed = JSON.parse(payload.output_text) as {
    abstract: string;
    sections: Array<{ order: number; title: string; notes: string }>;
    markdown: string;
  };

  return {
    mode: 'model' as const,
    ...parsed
  };
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

    const modelResult = await generateByModel(normalized);
    if (modelResult) {
      return NextResponse.json({ data: modelResult });
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
