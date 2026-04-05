interface ProviderConfig {
  provider: 'openai' | 'deepseek' | 'anthropic' | 'gemini';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

const PROVIDER_TIMEOUT_MS = 20_000;
const MAX_PROVIDER_TEXT_LENGTH = 20_000;

function buildBaseUrl(provider: ProviderConfig['provider'], custom?: string) {
  if (custom?.trim()) return custom.trim().replace(/\/$/, '');
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  if (provider === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta';
  return 'https://api.openai.com/v1';
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function safeText(value: unknown) {
  return String(value ?? '').trim().slice(0, MAX_PROVIDER_TEXT_LENGTH);
}

async function fetchJsonWithTimeout(
  url: string,
  init?: RequestInit
) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { response, payload };
}

export async function generateStructuredDraftByProvider(input: {
  provider: ProviderConfig['provider'];
  apiKey: string;
  baseUrl?: string;
  model?: string;
  prompt: string;
}) {
  const provider = input.provider;
  const apiKey = input.apiKey.trim();
  if (!apiKey) return null;

  const baseUrl = buildBaseUrl(provider, input.baseUrl);

  if (provider === 'anthropic') {
    const model = input.model?.trim() || 'claude-3-5-sonnet-latest';
    const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: `${input.prompt}\n\nReturn strict JSON object only.` }]
      })
    });

    if (!response.ok) return null;
    const content = Array.isArray(payload?.content) ? payload.content : [];
    const text = safeText(content.find((x) => x && typeof x === 'object' && 'type' in x && (x as { type?: string }).type === 'text')?.text);
    return extractJsonObject(text);
  }

  if (provider === 'gemini') {
    const model = input.model?.trim() || 'gemini-1.5-pro';
    const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${input.prompt}\n\nReturn strict JSON object only.` }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!response.ok) return null;
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const first = candidates[0] as { content?: { parts?: Array<{ text?: string }> } } | undefined;
    const text = safeText(first?.content?.parts?.[0]?.text);
    return extractJsonObject(text);
  }

  const model = input.model?.trim() || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4.1-mini');
  const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: input.prompt,
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

  if (!response.ok) return null;
  const outputText = safeText(payload?.output_text);
  if (!outputText) return null;
  return extractJsonObject(outputText);
}

export async function generateChatByProvider(input: {
  provider: ProviderConfig['provider'];
  apiKey: string;
  baseUrl?: string;
  model?: string;
  message: string;
}) {
  const provider = input.provider;
  const apiKey = input.apiKey.trim();
  if (!apiKey) return null;

  const baseUrl = buildBaseUrl(provider, input.baseUrl);

  if (provider === 'anthropic') {
    const model = input.model?.trim() || 'claude-3-5-sonnet-latest';
    const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: input.message }]
      })
    });

    if (!response.ok) return null;
    const content = Array.isArray(payload?.content) ? payload.content : [];
    const text = safeText(content.find((x) => x && typeof x === 'object' && 'type' in x && (x as { type?: string }).type === 'text')?.text);
    return text || null;
  }

  if (provider === 'gemini') {
    const model = input.model?.trim() || 'gemini-1.5-pro';
    const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input.message }] }],
        generationConfig: { temperature: 0.4 }
      })
    });

    if (!response.ok) return null;
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const first = candidates[0] as { content?: { parts?: Array<{ text?: string }> } } | undefined;
    return safeText(first?.content?.parts?.[0]?.text) || null;
  }

  const model = input.model?.trim() || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4.1-mini');
  const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input: input.message })
  });

  if (!response.ok) return null;
  return safeText(payload?.output_text) || null;
}


export async function listModelsByProvider(input: {
  provider: ProviderConfig['provider'];
  apiKey: string;
  baseUrl?: string;
}) {
  const provider = input.provider;
  const apiKey = input.apiKey.trim();
  if (!apiKey) return [] as string[];

  const baseUrl = buildBaseUrl(provider, input.baseUrl);

  if (provider === 'anthropic') {
    const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/models`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    if (!response.ok) return [];
    const data = Array.isArray(payload?.data) ? payload.data : [];
    return data.map((m) => safeText((m as { id?: string })?.id)).filter(Boolean);
  }

  if (provider === 'gemini') {
    const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/models?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) return [];
    const models = Array.isArray(payload?.models) ? payload.models : [];
    return models
      .map((m) => safeText((m as { name?: string })?.name))
      .filter((name) => name.startsWith('models/'))
      .map((name) => name.replace('models/', ''));
  }

  const { response, payload } = await fetchJsonWithTimeout(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!response.ok) return [];
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.map((m) => safeText((m as { id?: string })?.id)).filter(Boolean);
}
