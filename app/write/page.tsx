'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { getSiteLang } from '@/lib/site-copy';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';

interface DraftResponse {
  mode: string;
  abstract: string;
  sections: Array<{ order: number; title: string; notes: string }>;
  markdown: string;
}

const modelOptions: Record<Provider, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash']
};

export default function WritePage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = useMemo(() => getSiteLang(searchParams?.lang), [searchParams?.lang]);
  const [topic, setTopic] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [articleType, setArticleType] = useState('research_article');

  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(modelOptions.openai[0]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<DraftResponse | null>(null);

  const [collabInput, setCollabInput] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabOutput, setCollabOutput] = useState('');

  useEffect(() => {
    setModel(modelOptions[provider][0]);
  }, [provider]);

  async function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic.trim()) {
      setMessage(lang === 'zh' ? '请先输入主题。' : 'Please enter a topic first.');
      return;
    }

    setLoading(true);
    setMessage('');
    setDraft(null);

    const response = await fetch('/api/public/draft-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        discipline,
        article_type: articleType,
        language: lang === 'en' ? 'en' : 'zh',
        section_count: 6,
        provider,
        api_key: apiKey,
        model
      })
    });

    const body = await response.json().catch(() => ({ data: null, error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(body.error ?? (lang === 'zh' ? '生成失败，请重试。' : 'Generation failed, please retry.'));
      setLoading(false);
      return;
    }

    setDraft(body.data ?? null);
    setLoading(false);
  }

  async function collaborate() {
    if (!collabInput.trim()) {
      setCollabOutput(lang === 'zh' ? '请输入你要和模型讨论的问题。' : 'Please enter your collaboration prompt.');
      return;
    }

    setCollabLoading(true);
    setCollabOutput('');

    const response = await fetch('/api/public/ai-collab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: collabInput,
        provider,
        api_key: apiKey,
        model
      })
    });

    const body = await response.json().catch(() => ({ data: null, error: 'Unknown error' }));
    if (!response.ok) {
      setCollabOutput(body.error ?? (lang === 'zh' ? '协作调用失败。' : 'Collaboration call failed.'));
      setCollabLoading(false);
      return;
    }

    setCollabOutput(body.data?.text ?? '');
    setCollabLoading(false);
  }

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={lang === 'zh' ? '论文写作工作台（Beta）' : 'Paper Writing Studio (Beta)'}
        subtitle={
          lang === 'zh'
            ? '选择模型品牌和模型名，输入 API Key 后即可协作写作。'
            : 'Select provider + model and input your API key to collaborate on writing.'
        }
      />

      <section className="glass-panel p-6">
        <div className="mb-6 grid gap-3 rounded border border-zinc-200 bg-white p-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Provider</label>
            <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Model</label>
            <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={model} onChange={(e) => setModel(e.target.value)}>
              {modelOptions[provider].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">API Key</label>
            <input type="password" className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </div>
          <p className="text-xs text-zinc-500 md:col-span-2">
            {lang === 'zh'
              ? '提示：密钥仅用于当前请求，不会写入数据库。Base URL 由服务端统一配置。'
              : 'Note: keys are used only for the current request and are not persisted. Base URL is server-configured.'}
          </p>
        </div>

        <form onSubmit={generateDraft} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{lang === 'zh' ? '研究主题' : 'Topic'}</label>
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">{lang === 'zh' ? '学科' : 'Discipline'}</label>
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">{lang === 'zh' ? '稿件类型' : 'Article Type'}</label>
            <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={articleType} onChange={(e) => setArticleType(e.target.value)}>
              <option value="research_article">{lang === 'zh' ? '研究论文' : 'Research Article'}</option>
              <option value="review">{lang === 'zh' ? '综述' : 'Review'}</option>
              <option value="short_communication">{lang === 'zh' ? '短通讯' : 'Short Communication'}</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? (lang === 'zh' ? '生成中…' : 'Generating...') : (lang === 'zh' ? '生成草稿' : 'Generate Draft')}
          </button>
        </form>

        {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}

        {draft ? (
          <div className="mt-6 space-y-4 rounded border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{lang === 'zh' ? '生成模式' : 'Mode'}: {draft.mode}</p>
            <div>
              <h3 className="font-semibold">{lang === 'zh' ? '摘要草稿' : 'Draft Abstract'}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{draft.abstract}</p>
            </div>

            <div>
              <h3 className="font-semibold">{lang === 'zh' ? '章节建议' : 'Section Suggestions'}</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-zinc-800">
                {draft.sections.map((section) => (
                  <li key={`${section.order}-${section.title}`}>
                    <p className="font-medium">{section.title}</p>
                    <p>{section.notes}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-semibold">Markdown</h3>
              <textarea className="mt-2 h-64 w-full rounded border border-zinc-300 bg-zinc-50 p-3 text-xs" value={draft.markdown} readOnly />
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded border border-zinc-200 bg-white p-4">
          <h3 className="font-semibold">{lang === 'zh' ? '与模型协作（问答）' : 'Collaborate with Model (Q&A)'}</h3>
          <textarea className="mt-2 h-28 w-full rounded border border-zinc-300 p-3 text-sm" value={collabInput} onChange={(e) => setCollabInput(e.target.value)} placeholder={lang === 'zh' ? '例如：请帮我改写摘要并提高可读性。' : 'e.g. Help me refine this abstract for readability.'} />
          <button type="button" onClick={collaborate} className="btn btn-secondary mt-3" disabled={collabLoading}>
            {collabLoading ? (lang === 'zh' ? '请求中…' : 'Requesting...') : (lang === 'zh' ? '发送给模型' : 'Send to model')}
          </button>
          {collabOutput ? <pre className="mt-3 whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-800">{collabOutput}</pre> : null}
        </div>
      </section>
    </main>
  );
}
