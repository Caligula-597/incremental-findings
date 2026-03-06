'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { Submission, SubmissionStatus } from '@/lib/types';

export default function EditorPage() {
  const [pending, setPending] = useState<Submission[]>([]);
  const [published, setPublished] = useState<Submission[]>([]);
  const [message, setMessage] = useState('');

  async function loadData() {
    const [pendingRes, publishedRes] = await Promise.all([
      fetch('/api/submissions?status=pending', { cache: 'no-store' }),
      fetch('/api/submissions?status=published', { cache: 'no-store' })
    ]);

    const pendingJson = await pendingRes.json();
    const publishedJson = await publishedRes.json();

    setPending(pendingJson.data ?? []);
    setPublished(publishedJson.data ?? []);
  }

  async function updateStatus(id: string, status: SubmissionStatus) {
    setMessage('');
    const response = await fetch(`/api/submissions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      setMessage(`状态更新失败: ${body.error ?? ''}`);
      return;
    }

    setMessage(`状态已更新为 ${status}`);
    await loadData();
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Editor Management System</h2>
      {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}

      <section className="mt-8">
        <h3 className="font-serif text-2xl">Pending Submissions</h3>
        <div className="mt-4 grid gap-4">
          {pending.length === 0 ? <p>No pending submissions.</p> : null}
          {pending.map((item) => (
            <article key={item.id} className="rounded border border-zinc-300 p-4">
              <h4 className="font-serif text-xl">{item.title}</h4>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <p className="mt-2 text-sm">{(item.abstract ?? 'No abstract provided.').slice(0, 200)}...</p>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded bg-zinc-700 px-3 py-1 text-sm text-white"
                  onClick={() => updateStatus(item.id, 'under_review')}
                >
                  Move to Under Review
                </button>
                <button
                  className="rounded bg-black px-3 py-1 text-sm text-white"
                  onClick={() => updateStatus(item.id, 'published')}
                >
                  Publish
                </button>
                <button
                  className="rounded bg-red-700 px-3 py-1 text-sm text-white"
                  onClick={() => updateStatus(item.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="font-serif text-2xl">Published Submissions</h3>
        <div className="mt-4 grid gap-4">
          {published.map((item) => (
            <article key={item.id} className="rounded border border-zinc-300 p-4">
              <h4 className="font-serif text-xl">{item.title}</h4>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <a className="mt-2 inline-block text-sm underline" href={item.file_url ?? '#'} target="_blank" rel="noreferrer">
                View PDF
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
