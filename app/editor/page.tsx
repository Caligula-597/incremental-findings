'use client';

import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { MetricCard, SectionTitle, StatusPill } from '@/components/ui-kit';
import { DISCIPLINES } from '@/lib/taxonomy';
import { Submission, SubmissionStatus } from '@/lib/types';

function TaxonomyMeta({ item }: { item: Submission }) {
  return (
    <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
      {[item.discipline, item.topic, item.article_type].filter(Boolean).join(' · ') || 'Unclassified'}
    </p>
  );
}

function matchesFilter(item: Submission, query: string, discipline: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const content = `${item.title} ${item.authors} ${item.abstract ?? ''} ${item.topic ?? ''}`.toLowerCase();
  const queryMatch = normalizedQuery ? content.includes(normalizedQuery) : true;
  const disciplineMatch = discipline === 'all' ? true : item.discipline === discipline;
  return queryMatch && disciplineMatch;
}

export default function EditorPage() {
  const [pending, setPending] = useState<Submission[]>([]);
  const [underReview, setUnderReview] = useState<Submission[]>([]);
  const [published, setPublished] = useState<Submission[]>([]);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('all');

  async function loadData() {
    const [pendingRes, reviewRes, publishedRes] = await Promise.all([
      fetch('/api/submissions?status=pending', { cache: 'no-store' }),
      fetch('/api/submissions?status=under_review', { cache: 'no-store' }),
      fetch('/api/submissions?status=published', { cache: 'no-store' })
    ]);

    const pendingJson = await pendingRes.json();
    const reviewJson = await reviewRes.json();
    const publishedJson = await publishedRes.json();

    setPending(pendingJson.data ?? []);
    setUnderReview(reviewJson.data ?? []);
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

  const filteredPending = useMemo(
    () => pending.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [pending, query, disciplineFilter]
  );
  const filteredUnderReview = useMemo(
    () => underReview.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [underReview, query, disciplineFilter]
  );
  const filteredPublished = useMemo(
    () => published.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [published, query, disciplineFilter]
  );

  const totalActive = useMemo(() => pending.length + underReview.length, [pending.length, underReview.length]);

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title="Editorial Workspace"
        subtitle="Manage screening, review progression and publishing decisions in one place."
      />

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <MetricCard label="Pending" value={pending.length} />
        <MetricCard label="Under review" value={underReview.length} />
        <MetricCard label="Published" value={published.length} />
        <MetricCard label="Active queue" value={totalActive} />
      </section>

      <section className="glass-panel mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, authors, abstract, topic"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <select
            value={disciplineFilter}
            onChange={(event) => setDisciplineFilter(event.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="all">All disciplines</option>
            {DISCIPLINES.map((discipline) => (
              <option key={discipline} value={discipline}>
                {discipline}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDisciplineFilter('all');
            }}
            className="btn btn-secondary"
          >
            Reset filters
          </button>
        </div>
      </section>

      {message ? <p className="mb-4 text-sm text-zinc-700">{message}</p> : null}

      <section className="mt-8">
        <SectionTitle title="Submissions in progress" />
        <div className="mt-4 grid gap-4">
          {filteredPending.length === 0 ? <p>No pending submissions.</p> : null}
          {filteredPending.map((item) => (
            <article key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-serif text-xl">{item.title}</h4>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <TaxonomyMeta item={item} />
              <p className="mt-2 text-sm">{(item.abstract ?? 'No abstract provided.').slice(0, 200)}...</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(item.id, 'under_review')}>
                  Move to under review
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => updateStatus(item.id, 'rejected')}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Peer review queue" />
        <div className="mt-4 grid gap-4">
          {filteredUnderReview.length === 0 ? <p>No submissions under review.</p> : null}
          {filteredUnderReview.map((item) => (
            <article key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-serif text-xl">{item.title}</h4>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <TaxonomyMeta item={item} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => updateStatus(item.id, 'published')}>
                  Publish
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => updateStatus(item.id, 'rejected')}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Published work" />
        <div className="mt-4 grid gap-4">
          {filteredPublished.length === 0 ? <p>No published submissions.</p> : null}
          {filteredPublished.map((item) => (
            <article key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-serif text-xl">{item.title}</h4>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <TaxonomyMeta item={item} />
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
