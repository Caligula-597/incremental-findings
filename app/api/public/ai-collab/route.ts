import { NextResponse } from 'next/server';
import { generateChatByProvider } from '@/lib/ai-provider-client';
import { guardRequest } from '@/lib/request-guard';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';
const PROVIDERS: Provider[] = ['openai', 'deepseek', 'anthropic', 'gemini'];
const MAX_MESSAGE_LENGTH = 8_000;

interface CollaborateBody {
  message?: string;
  provider?: Provider;
  api_key?: string;
  model?: string;
}

export async function POST(request: Request) {
  try {
    const guard = await guardRequest(request, {
      route: '/api/public/ai-collab',
      bucketPrefix: 'public:ai-collab',
      maxRequests: 20,
      windowMs: 60_000,
      limitError: 'Too many AI collaboration requests. Please try again later.'
    });

    if (guard.response) return guard.response;

    const body = (await request.json().catch(() => ({}))) as CollaborateBody;
    const message = String(body.message ?? '').trim();
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `message is too long (max ${MAX_MESSAGE_LENGTH} chars)` }, { status: 400 });
    }

    const provider = PROVIDERS.includes(body.provider as Provider) ? (body.provider as Provider) : 'openai';
    const apiKey = String(body.api_key ?? process.env.OPENAI_API_KEY ?? '').trim();
    const model = String(body.model ?? process.env.OPENAI_DRAFT_MODEL ?? '').trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'api_key is required (you can input your provider API key on the page).'
        },
        { status: 400 }
      );
    }

    const text = await generateChatByProvider({
      provider,
      apiKey,
      model: model || undefined,
      message
    });

    if (!text) {
      return NextResponse.json({ error: 'Provider call failed. Please verify api_key/model/provider.' }, { status: 502 });
    }

    return NextResponse.json({ data: { mode: `model:${provider}`, text } });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
