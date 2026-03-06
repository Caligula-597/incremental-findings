'use client';

import { FormEvent, useState } from 'react';
import { SiteHeader } from '@/components/header';

const categories = ['Mathematics', 'Physics', 'Computer Science', 'Life Science', 'Other'];

export default function SubmitPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') ?? ''),
      journal: String(formData.get('journal') ?? ''),
      category: String(formData.get('category') ?? 'Other'),
      review: String(formData.get('review') ?? ''),
      fileUrl: String(formData.get('fileUrl') ?? '#')
    };

    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setMessage('提交失败，请检查字段后重试。');
      setLoading(false);
      return;
    }

    setMessage('提交成功，请等待编辑审核。');
    event.currentTarget.reset();
    setLoading(false);
  }

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Author Submission Portal</h2>

      <form className="mt-6 grid gap-4 rounded border border-zinc-300 p-6" onSubmit={onSubmit}>
        <input required name="title" placeholder="论文标题" className="rounded border border-zinc-300 px-3 py-2" />
        <input required name="journal" placeholder="原投稿期刊" className="rounded border border-zinc-300 px-3 py-2" />

        <select name="category" className="rounded border border-zinc-300 px-3 py-2">
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <textarea
          required
          name="review"
          placeholder="研究价值复盘"
          rows={6}
          className="rounded border border-zinc-300 px-3 py-2"
        />

        <input
          name="fileUrl"
          placeholder="PDF 链接（低配版先用 URL 代替上传）"
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
