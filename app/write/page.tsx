'use client';

import { FormEvent, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { getSiteLang } from '@/lib/site-copy';

interface DraftResponse {
  mode: 'model' | 'local-template';
  abstract: string;
  sections: Array<{ order: number; title: string; notes: string }>;
  markdown: string;
}

export default function WritePage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = useMemo(() => getSiteLang(searchParams?.lang), [searchParams?.lang]);
  const [topic, setTopic] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [articleType, setArticleType] = useState('research_article');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<DraftResponse | null>(null);

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
        section_count: 6
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

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={lang === 'zh' ? '论文写作工作台（Beta）' : 'Paper Writing Studio (Beta)'}
        subtitle={
          lang === 'zh'
            ? '输入主题后，系统会生成摘要草稿和章节建议。可直接复制到你的投稿草稿中。'
            : 'Enter a topic to generate a draft abstract and recommended section structure.'
        }
      />

      <section className="glass-panel p-6">
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
      </section>
    </main>
  );
}
