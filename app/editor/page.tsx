'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { isResolvableDoi } from '@/lib/doi';
import { MetricCard, SectionTitle, StatusPill } from '@/components/ui-kit';
import { DISCIPLINES } from '@/lib/taxonomy';
import { Submission, SubmissionStatus } from '@/lib/types';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { withLang } from '@/lib/lang';

interface EditorHistoryItem {
  submission_id: string;
  title: string;
  action: string;
  detail: string;
  created_at: string;
}

interface EditorApplication {
  id: string;
  applicant_email: string;
  applicant_name: string;
  statement: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
}

function TaxonomyMeta({ item, unclassified }: { item: Submission; unclassified: string }) {
  return (
    <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
      {[item.discipline, item.topic, item.article_type].filter(Boolean).join(' · ') || unclassified}
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
  const [lang, setLang] = useState(getSiteLang());
  const copy = useMemo(() => getSiteCopy(lang), [lang]);

  const [pending, setPending] = useState<Submission[]>([]);
  const [underReview, setUnderReview] = useState<Submission[]>([]);
  const [published, setPublished] = useState<Submission[]>([]);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [isEditor, setIsEditor] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [applications, setApplications] = useState<EditorApplication[]>([]);
  const [history, setHistory] = useState<EditorHistoryItem[]>([]);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [responseFiles, setResponseFiles] = useState<Record<string, File | null>>({});

  async function loadData() {
    const [pendingRes, reviewRes, publishedRes] = await Promise.all([
      fetch('/api/submissions?status=pending&include_files=true', { cache: 'no-store' }),
      fetch('/api/submissions?status=under_review&include_files=true', { cache: 'no-store' }),
      fetch('/api/submissions?status=published&include_files=true', { cache: 'no-store' })
    ]);

    if (!pendingRes.ok || !reviewRes.ok || !publishedRes.ok) {
      const detail = await pendingRes.json().catch(() => ({ error: 'Unable to load editorial queues' }));
      setMessage(`${copy.editor.loadFailedPrefix}${detail.error ?? 'Unknown error'}`);
      return;
    }

    const pendingJson = await pendingRes.json();
    const reviewJson = await reviewRes.json();
    const publishedJson = await publishedRes.json();

    setPending(pendingJson.data ?? []);
    setUnderReview(reviewJson.data ?? []);
    setPublished(publishedJson.data ?? []);
  }



  async function loadApplications() {
    const response = await fetch('/api/editor/applications?status=pending', { cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json().catch(() => ({ data: [] }));
    setApplications(body.data ?? []);
  }


  async function loadHistory() {
    const response = await fetch('/api/editor/history', { cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json().catch(() => ({ data: [] }));
    setHistory(body.data ?? []);
  }

  async function inviteApplicant(application: EditorApplication) {
    setMessage('');
    const response = await fetch('/api/editor/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicant_email: application.applicant_email, application_id: application.id, expires_in_days: 7 })
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${copy.editor.inviteFailedPrefix}${body.error ?? ''}`);
      return;
    }

    const code = body?.data?.invite_code;
    setMessage(code ? `${copy.editor.inviteCreatedPrefix}${code}` : copy.editor.inviteCreated);
    await loadApplications();
  }

  async function updateStatus(id: string, status: SubmissionStatus) {
    setMessage('');

    const reason = (responseNotes[id] ?? '').trim();
    const responseLetter = (responseNotes[id] ?? '').trim();
    const responseFile = responseFiles[id] ?? null;

    if (status === 'rejected' && !reason) {
      setMessage(copy.editor.rejectReasonRequired);
      return;
    }

    const form = new FormData();
    form.set('status', status);
    if (reason) form.set('reason', reason);
    if (responseLetter) form.set('response_letter', responseLetter);
    if (responseFile) form.set('response_file', responseFile);

    const response = await fetch(`/api/submissions/${id}/status`, {
      method: 'PATCH',
      body: form
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      setMessage(`${copy.editor.updateStatusFailedPrefix}${body.error ?? ''}`);
      return;
    }

    setResponseNotes((prev) => ({ ...prev, [id]: '' }));
    setResponseFiles((prev) => ({ ...prev, [id]: null }));
    setMessage(`${copy.editor.updateStatusSuccessPrefix}${status}`);
    await Promise.all([loadData(), loadHistory()]);
  }


  async function assignDoi(id: string) {
    setMessage('');
    const response = await fetch(`/api/submissions/${id}/doi`, { method: 'POST' });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${copy.editor.assignDoiFailedPrefix}${body.error ?? ''}`);
      return;
    }

    const doiValue = body?.data?.doi as string | undefined;
    setMessage(doiValue ? `${copy.editor.publicationIdAssignedPrefix}${doiValue}` : copy.editor.identifierAssigned);
    await loadData();
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setLang(getSiteLang(params.get('lang')));
  }, []);

  useEffect(() => {
    async function boot() {
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      const sessionBody = await sessionRes.json().catch(() => ({ data: null }));
      const role = sessionBody?.data?.role;
      if (sessionRes.ok && role === 'editor') {
        setIsEditor(true);
        await Promise.all([loadData(), loadApplications(), loadHistory()]);
      }
      setCheckingSession(false);
    }

    void boot();
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

  if (checkingSession) {
    return (
      <main>
        <SiteHeader />
        <section className="glass-panel p-8">
          <p className="text-sm text-zinc-700">{copy.editor.checkingAuthorization}</p>
        </section>
      </main>
    );
  }

  if (!isEditor) {
    return (
      <main>
        <SiteHeader />
        <section className="glass-panel p-8">
          <h2 className="font-serif text-3xl">{copy.editor.loginRequiredTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm text-zinc-700">
            {copy.editor.loginRequiredDesc}
          </p>
          <Link className="btn btn-primary mt-5" href={withLang('/login', lang)}>
            {copy.editor.goToLogin}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={copy.editor.workspaceTitle}
        subtitle={copy.editor.workspaceSubtitle}
      />

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <MetricCard label={copy.editor.pendingMetric} value={pending.length} />
        <MetricCard label={copy.editor.underReviewMetric} value={underReview.length} />
        <MetricCard label={copy.editor.publishedMetric} value={published.length} />
        <MetricCard label={copy.editor.activeQueueMetric} value={totalActive} />
      </section>

      <section className="glass-panel mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.editor.searchPlaceholder}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <select
            value={disciplineFilter}
            onChange={(event) => setDisciplineFilter(event.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="all">{copy.editor.allDisciplines}</option>
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
            {copy.editor.resetFilters}
          </button>
        </div>
      </section>

      {message ? <p className="mb-4 text-sm text-zinc-700">{message}</p> : null}

      <section className="mt-6">
        <SectionTitle title={copy.editor.applicationsTitle} subtitle={copy.editor.applicationsSubtitle} />
        <div className="mt-4 grid gap-3">
          {applications.length === 0 ? <p className="text-sm text-zinc-600">{copy.editor.noPendingApplications}</p> : null}
          {applications.map((application) => (
            <article key={application.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{application.applicant_name}</p>
                  <p className="text-sm text-zinc-600">{application.applicant_email}</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => inviteApplicant(application)}>
                  {copy.editor.approveAndInvite}
                </button>
              </div>
              <p className="mt-2 text-sm text-zinc-700">{application.statement}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle title={copy.editor.submissionsInProgress} />
        <div className="mt-4 grid gap-4">
          {filteredPending.length === 0 ? <p>{copy.editor.noPendingSubmissions}</p> : null}
          {filteredPending.map((item) => (
            <article key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-serif text-xl">{item.title}</h4>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <TaxonomyMeta item={item} unclassified={copy.editor.unclassified} />
              {(item.files ?? []).length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-xs text-zinc-700">
                  {(item.files ?? []).map((file) => (
                    <li key={file.id}>
                      {file.file_kind}:
                      <a className="ml-1 underline" href={`/api/submissions/files/${file.id}`} target="_blank" rel="noreferrer">
                        {file.file_name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-sm">{(item.abstract ?? copy.editor.noAbstract).slice(0, 200)}...</p>
              <div className="mt-3 grid gap-2 rounded-md border border-zinc-200 bg-white/80 p-3">
                <textarea
                  value={responseNotes[item.id] ?? ''}
                  onChange={(event) => setResponseNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  rows={3}
                  placeholder={lang === 'zh' ? '填写给作者/审稿人的回复（可选，拒稿建议必填）' : 'Write response letter/note (optional; required for rejection)'}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  onChange={(event) => setResponseFiles((prev) => ({ ...prev, [item.id]: event.target.files?.[0] ?? null }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                {responseFiles[item.id] ? <p className="text-xs text-zinc-600">{lang === 'zh' ? '已选择附件: ' : 'Attachment selected: '}{responseFiles[item.id]?.name}</p> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(item.id, 'under_review')}>
                  {copy.editor.moveToUnderReview}
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
        <SectionTitle title={copy.editor.peerReviewQueue} />
        <div className="mt-4 grid gap-4">
          {filteredUnderReview.length === 0 ? <p>{copy.editor.noUnderReviewSubmissions}</p> : null}
          {filteredUnderReview.map((item) => (
            <article key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-serif text-xl">{item.title}</h4>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <TaxonomyMeta item={item} unclassified={copy.editor.unclassified} />
              {(item.files ?? []).length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-xs text-zinc-700">
                  {(item.files ?? []).map((file) => (
                    <li key={file.id}>
                      {file.file_kind}:
                      <a className="ml-1 underline" href={`/api/submissions/files/${file.id}`} target="_blank" rel="noreferrer">
                        {file.file_name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 grid gap-2 rounded-md border border-zinc-200 bg-white/80 p-3">
                <textarea
                  value={responseNotes[item.id] ?? ''}
                  onChange={(event) => setResponseNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  rows={3}
                  placeholder={lang === 'zh' ? '填写审稿回复/处理信件（可选）' : 'Write editorial response letter (optional)'}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  onChange={(event) => setResponseFiles((prev) => ({ ...prev, [item.id]: event.target.files?.[0] ?? null }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                {responseFiles[item.id] ? <p className="text-xs text-zinc-600">{lang === 'zh' ? '已选择附件: ' : 'Attachment selected: '}{responseFiles[item.id]?.name}</p> : null}
              </div>
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
        <SectionTitle title={copy.editor.publishedWork} />
        <div className="mt-4 grid gap-4">
          {filteredPublished.length === 0 ? <p>{copy.editor.noPublishedSubmissions}</p> : null}
          {filteredPublished.map((item) => (
            <article key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-serif text-xl">{item.title}</h4>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
              <TaxonomyMeta item={item} unclassified={copy.editor.unclassified} />
              {(item.files ?? []).length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-xs text-zinc-700">
                  {(item.files ?? []).map((file) => (
                    <li key={file.id}>
                      {file.file_kind}:
                      <a className="ml-1 underline" href={`/api/submissions/files/${file.id}`} target="_blank" rel="noreferrer">
                        {file.file_name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a className="inline-block text-sm underline" href={item.file_url ?? '#'} target="_blank" rel="noreferrer">
                  {copy.editor.viewPdf}
                </a>
                {item.doi ? (
                  isResolvableDoi(item.doi) ? (
                    <a
                      className="text-xs font-semibold text-zinc-700 underline"
                      href={`https://doi.org/${item.doi}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      DOI: {item.doi}
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-700">{copy.editor.publicationIdPrefix}{item.doi}</span>
                  )
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => assignDoi(item.id)}>
                    {copy.editor.assignPublicationId}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title={lang === 'zh' ? '编辑审稿记录' : 'Editorial review history'} subtitle={lang === 'zh' ? '查看你最近阅读和处理过的稿件。' : 'Track manuscripts you recently read and handled.'} />
        <div className="mt-4 grid gap-3">
          {history.length === 0 ? <p className="text-sm text-zinc-600">{lang === 'zh' ? '暂无记录' : 'No history yet.'}</p> : null}
          {history.map((entry) => (
            <article key={`${entry.submission_id}-${entry.created_at}-${entry.action}`} className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm">
              <p className="font-semibold">{entry.title}</p>
              <p className="text-xs text-zinc-600">{entry.action} · {new Date(entry.created_at).toLocaleString()}</p>
              <p className="mt-1 text-zinc-700">{entry.detail}</p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
