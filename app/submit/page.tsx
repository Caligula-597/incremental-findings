'use client';

import { FormEvent, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { ARTICLE_TYPES, DISCIPLINES, TOPIC_MAP } from '@/lib/taxonomy';

export default function SubmitPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);

  const topics = useMemo(() => TOPIC_MAP[discipline as (typeof DISCIPLINES)[number]] ?? [], [discipline]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') ?? ''),
      authors: String(formData.get('authors') ?? ''),
      abstract: String(formData.get('abstract') ?? ''),
      discipline: String(formData.get('discipline') ?? ''),
      topic: String(formData.get('topic') ?? ''),
      article_type: String(formData.get('article_type') ?? ''),
      file_url: String(formData.get('file_url') ?? '')
    };

    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      setMessage(`提交失败: ${body.error ?? '请检查字段后重试。'}`);
      setLoading(false);
      return;
    }

    setMessage('提交成功，请等待编辑审核。');
    event.currentTarget.reset();
    setDiscipline(DISCIPLINES[0]);
    setLoading(false);
  }

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Submission Portal</h2>
      <p className="mt-2 text-sm text-zinc-600">Define discipline, topic and research format before submission.</p>

      <form className="mt-6 grid gap-4 rounded border border-zinc-300 p-6" onSubmit={onSubmit}>
        <input required name="title" placeholder="论文标题" className="rounded border border-zinc-300 px-3 py-2" />
        <input required name="authors" placeholder="作者（例如: A. Li, B. Chen）" className="rounded border border-zinc-300 px-3 py-2" />

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Discipline
            <select
              name="discipline"
              className="rounded border border-zinc-300 px-3 py-2"
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value)}
            >
              {DISCIPLINES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Topic
            <select name="topic" className="rounded border border-zinc-300 px-3 py-2" defaultValue={topics[0]}>
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Article type
            <select name="article_type" className="rounded border border-zinc-300 px-3 py-2" defaultValue={ARTICLE_TYPES[0]}>
              {ARTICLE_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea
          name="abstract"
          placeholder="摘要（可选）"
          rows={6}
          className="rounded border border-zinc-300 px-3 py-2"
        />

        <input
          name="file_url"
          placeholder="PDF 链接（例如 Supabase Storage 公共链接）"
          className="rounded border border-zinc-300 px-3 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Submitting...' : '提交审查'}
        </button>

        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>
    </main>
  );
}
