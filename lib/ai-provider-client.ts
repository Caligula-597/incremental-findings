interface ProviderConfig {
  provider: 'openai' | 'deepseek' | 'anthropic' | 'gemini';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

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
    const response = await fetch(`${baseUrl}/messages`, {
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
    const payload = (await response.json().catch(() => null)) as { content?: Array<{ type: string; text?: string }> } | null;
    const text = payload?.content?.find((x) => x.type === 'text')?.text ?? '';
    return extractJsonObject(text);
  }

  if (provider === 'gemini') {
    const model = input.model?.trim() || 'gemini-1.5-pro';
    const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${input.prompt}\n\nReturn strict JSON object only.` }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } | null;
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return extractJsonObject(text);
  }

  const model = input.model?.trim() || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4.1-mini');
  const response = await fetch(`${baseUrl}/responses`, {
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
  const payload = (await response.json().catch(() => null)) as { output_text?: string } | null;
  if (!payload?.output_text) return null;
  return extractJsonObject(payload.output_text);
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
    const response = await fetch(`${baseUrl}/messages`, {
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
    const payload = (await response.json().catch(() => null)) as { content?: Array<{ type: string; text?: string }> } | null;
    return payload?.content?.find((x) => x.type === 'text')?.text ?? null;
  }

  if (provider === 'gemini') {
    const model = input.model?.trim() || 'gemini-1.5-pro';
    const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input.message }] }],
        generationConfig: { temperature: 0.4 }
      })
    });

    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } | null;
    return payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  const model = input.model?.trim() || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4.1-mini');
  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input: input.message })
  });

  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as { output_text?: string } | null;
  return payload?.output_text ?? null;
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
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    if (!response.ok) return [];
    const payload = (await response.json().catch(() => null)) as { data?: Array<{ id?: string }> } | null;
    return (payload?.data ?? []).map((m) => String(m.id ?? '').trim()).filter(Boolean);
  }

  if (provider === 'gemini') {
    const response = await fetch(`${baseUrl}/models?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) return [];
    const payload = (await response.json().catch(() => null)) as { models?: Array<{ name?: string }> } | null;
    return (payload?.models ?? [])
      .map((m) => String(m.name ?? '').trim())
      .filter((name) => name.startsWith('models/'))
      .map((name) => name.replace('models/', ''));
  }

  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!response.ok) return [];
  const payload = (await response.json().catch(() => null)) as { data?: Array<{ id?: string }> } | null;
  return (payload?.data ?? []).map((m) => String(m.id ?? '').trim()).filter(Boolean);
}
