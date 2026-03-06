'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { Submission } from '@/lib/types';

export default function EditorPage() {
  const [pending, setPending] = useState<Submission[]>([]);
  const [published, setPublished] = useState<Submission[]>([]);

  async function loadData() {
    const [pendingRes, publishedRes] = await Promise.all([
      fetch('/api/submissions?status=pending', { cache: 'no-store' }),
      fetch('/api/submissions?status=published', { cache: 'no-store' })
    ]);

    setPending((await pendingRes.json()).data);
    setPublished((await publishedRes.json()).data);
  }

  async function publish(id: string) {
    await fetch(`/api/submissions/${id}/publish`, { method: 'POST' });
    await loadData();
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Editor Management System</h2>

      <section className="mt-8">
        <h3 className="font-serif text-2xl">Pending Submissions</h3>
        <div className="mt-4 grid gap-4">
          {pending.length === 0 ? <p>No pending submissions.</p> : null}
          {pending.map((item) => (
            <article key={item.id} className="rounded border border-zinc-300 p-4">
              <h4 className="font-serif text-xl">{item.title}</h4>
              <p className="mt-1 text-sm text-zinc-600">{item.journal}</p>
              <p className="mt-2 text-sm">{item.review.slice(0, 200)}...</p>
              <button className="mt-3 rounded bg-black px-3 py-1 text-sm text-white" onClick={() => publish(item.id)}>
                Publish
              </button>
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
              <p className="mt-1 text-sm text-zinc-600">{item.category}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
