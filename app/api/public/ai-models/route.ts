import { NextResponse } from 'next/server';
import { listModelsByProvider } from '@/lib/ai-provider-client';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';

interface ModelsBody {
  provider?: Provider;
  api_key?: string;
}

const fallbackModels: Record<Provider, string[]> = {
  openai: ['gpt-5', 'gpt-5-mini', 'gpt-4.1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  anthropic: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro']
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ModelsBody;
    const provider = (body.provider ?? 'openai') as Provider;
    const apiKey = String(body.api_key ?? '').trim();

    if (!apiKey) {
      return NextResponse.json({ data: { provider, models: fallbackModels[provider], source: 'fallback' as const } });
    }

    const models = await listModelsByProvider({ provider, apiKey });
    if (models.length === 0) {
      return NextResponse.json({ data: { provider, models: fallbackModels[provider], source: 'fallback' as const } });
    }

    const filtered = models
      .filter((name) => {
        if (provider === 'openai') return /^(gpt|o\d)/i.test(name);
        if (provider === 'gemini') return /^gemini/i.test(name);
        if (provider === 'anthropic') return /^claude/i.test(name);
        return true;
      })
      .slice(0, 40);

    return NextResponse.json({
      data: {
        provider,
        models: filtered.length > 0 ? filtered : models.slice(0, 40),
        source: 'provider' as const
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
