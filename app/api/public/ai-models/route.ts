import { NextResponse } from 'next/server';
import { listModelsByProvider } from '@/lib/ai-provider-client';
import { guardRequest } from '@/lib/request-guard';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';
const PROVIDERS: Provider[] = ['openai', 'deepseek', 'anthropic', 'gemini'];

interface ModelsBody {
  provider?: Provider;
  api_key?: string;
}

export async function POST(request: Request) {
  try {
    const guard = await guardRequest(request, {
      route: '/api/public/ai-models',
      bucketPrefix: 'public:ai-models',
      maxRequests: 30,
      windowMs: 60_000,
      limitError: 'Too many model-list requests. Please try again later.'
    });

    if (guard.response) return guard.response;

    const body = (await request.json().catch(() => ({}))) as ModelsBody;
    const provider = PROVIDERS.includes(body.provider as Provider) ? (body.provider as Provider) : 'openai';
    const apiKey = String(body.api_key ?? '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'api_key is required to fetch provider model list.' }, { status: 400 });
    }

    const models = await listModelsByProvider({ provider, apiKey });
    if (models.length === 0) {
      return NextResponse.json({ error: 'No models returned from provider. Please verify provider/api_key permissions.' }, { status: 502 });
    }

    const filtered = models
      .filter((name) => {
        if (provider === 'openai') return /^(gpt|o\d)/i.test(name);
        if (provider === 'gemini') return /^gemini/i.test(name);
        if (provider === 'anthropic') return /^claude/i.test(name);
        return true;
      })
      .slice(0, 100);

    return NextResponse.json({
      data: {
        provider,
        models: filtered.length > 0 ? filtered : models.slice(0, 100),
        source: 'provider' as const
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
