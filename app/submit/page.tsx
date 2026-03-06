'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { TERMS_VERSION, AUTHOR_AGREEMENT_ITEMS } from '@/lib/legal';
import { ARTICLE_TYPES, DISCIPLINES, TOPIC_MAP } from '@/lib/taxonomy';
import { SectionTitle } from '@/components/ui-kit';

const workflowSteps = [
  'Account login + optional ORCID linking',
  'Author agreement and compliance declaration',
  'Metadata entry (title/authors/discipline/topic/type)',
  'File package upload (manuscript + cover letter + optional supporting files)',
  'Submission receipt + editor progression (pending → under_review → decision)'
];

export default function SubmitPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [orcidId, setOrcidId] = useState<string | null>(null);

  const topics = useMemo(() => TOPIC_MAP[discipline as (typeof DISCIPLINES)[number]] ?? [], [discipline]);

  useEffect(() => {
    const raw = localStorage.getItem('if_user');
    if (!raw) return;
    const parsed = JSON.parse(raw) as { email?: string; id?: string };
    if (parsed.email) setUserEmail(parsed.email);
    if (parsed.id) setUserId(parsed.id);
  }, []);

  useEffect(() => {
    async function loadOrcid() {
      if (!userEmail && !userId) return;
      const query = userId ? `user_id=${encodeURIComponent(userId)}` : `email=${encodeURIComponent(userEmail)}`;
      const response = await fetch(`/api/orcid/status?${query}`);
      const body = await response.json().catch(() => ({ data: null }));
      setOrcidId(body.data?.orcid_id ?? null);
    }

    void loadOrcid();
  }, [userEmail, userId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set('terms_version', TERMS_VERSION);

    const response = await fetch('/api/submissions/complete', {
      method: 'POST',
      body: formData
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (!response.ok) {
      setMessage(`Submission failed: ${body.error ?? 'Please review required fields.'}`);
      setLoading(false);
      return;
    }

    const warningText = Array.isArray(body.warnings) && body.warnings.length > 0 ? ` Warnings: ${body.warnings.join(' | ')}` : '';
    setMessage(`Submission created successfully.${warningText}`);
    formElement.reset();
    setDiscipline(DISCIPLINES[0]);
    setLoading(false);
  }

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title="Submission Portal"
        subtitle="A guided pipeline with identity, compliance and package integrity checks before editorial screening."
      />

      <section className="mt-6 glass-panel p-6">
        <h3 className="font-serif text-2xl">Workflow overview</h3>
        <div className="mt-4 grid gap-2 lg:grid-cols-5">
          {workflowSteps.map((item, idx) => (
            <div key={item} className="rounded-lg border border-zinc-200 bg-white/85 px-3 py-3 text-sm text-zinc-700">
              <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] text-white">{idx + 1}</span>
              <p className="leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <form className="mt-6 grid gap-5 glass-panel p-6" onSubmit={onSubmit}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          Draft hint: your account identity is prefilled from local session. Complete all required file fields before submitting.
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">1) Author identity</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              required
              name="user_email"
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              type="email"
              placeholder="Your account email"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
            <input type="hidden" name="user_id" value={userId} readOnly />

            {orcidId ? (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Author ORCID: <span className="font-semibold">{orcidId}</span>
              </p>
            ) : (
              <a className="btn btn-secondary justify-center" href="/account">
                Manage ORCID / Account
              </a>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">2) Author agreement (required)</h3>
          <p className="mt-1 text-xs text-zinc-600">Terms version: {TERMS_VERSION}</p>
          <div className="mt-2 grid gap-2 text-sm">
            <label className="flex gap-2">
              <input required type="checkbox" name="author_warranty" value="true" />
              <span>{AUTHOR_AGREEMENT_ITEMS[0]}</span>
            </label>
            <label className="flex gap-2">
              <input required type="checkbox" name="originality_warranty" value="true" />
              <span>{AUTHOR_AGREEMENT_ITEMS[1]}</span>
            </label>
            <label className="flex gap-2">
              <input required type="checkbox" name="ethics_warranty" value="true" />
              <span>{AUTHOR_AGREEMENT_ITEMS[2]}</span>
            </label>
            <label className="flex gap-2">
              <input required type="checkbox" name="privacy_ack" value="true" />
              <span>{AUTHOR_AGREEMENT_ITEMS[3]}</span>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">3) Manuscript metadata</h3>
          <div className="mt-2 grid gap-3">
            <input required name="title" placeholder="Title" className="rounded-lg border border-zinc-300 px-3 py-2" />
            <input required name="authors" placeholder="Authors (comma-separated)" className="rounded-lg border border-zinc-300 px-3 py-2" />

            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Discipline
                <select
                  name="discipline"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
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
                <select name="topic" className="rounded-lg border border-zinc-300 px-3 py-2" defaultValue={topics[0]}>
                  {topics.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                Article type
                <select name="article_type" className="rounded-lg border border-zinc-300 px-3 py-2" defaultValue={ARTICLE_TYPES[0]}>
                  {ARTICLE_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea name="abstract" placeholder="Abstract" rows={5} className="rounded-lg border border-zinc-300 px-3 py-2" />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">4) File package upload</h3>
          <div className="mt-2 grid gap-3">
            <label className="grid gap-1 text-sm">
              Manuscript PDF (required)
              <input required name="manuscript" type="file" accept="application/pdf" className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm">
              Cover letter (required)
              <input required name="cover_letter" type="file" accept="application/pdf,.doc,.docx,.txt" className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm">
              Supporting materials (optional, multiple)
              <input name="supporting_files" multiple type="file" className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={loading} className="btn btn-primary w-fit disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit complete package'}
          </button>
          <p className="text-xs text-zinc-500">Estimated editorial triage feedback: within 5–7 business days.</p>
        </div>

        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>
    </main>
  );
}
