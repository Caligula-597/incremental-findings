import { NextResponse } from 'next/server';
import { generateChatByProvider } from '@/lib/ai-provider-client';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';

interface CollaborateBody {
  message?: string;
  provider?: Provider;
  api_key?: string;
  base_url?: string;
  model?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CollaborateBody;
    const message = String(body.message ?? '').trim();
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const provider = (body.provider ?? 'openai') as Provider;
    const apiKey = String(body.api_key ?? process.env.OPENAI_API_KEY ?? '').trim();
    const model = String(body.model ?? process.env.OPENAI_DRAFT_MODEL ?? '').trim();
    const baseUrl = String(body.base_url ?? process.env.OPENAI_BASE_URL ?? '').trim();

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
      baseUrl: baseUrl || undefined,
      message
    });

    if (!text) {
      return NextResponse.json({ error: 'Provider call failed. Please verify api_key/base_url/model/provider.' }, { status: 502 });
    }

    return NextResponse.json({ data: { mode: `model:${provider}`, text } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
