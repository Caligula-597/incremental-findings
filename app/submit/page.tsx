'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { TERMS_VERSION, getAuthorAgreement } from '@/lib/legal';
import { getArticleTypeOptions, getDisciplineOptions, getTaxonomyLabel, getTopicOptions } from '@/lib/taxonomy';
import { SectionTitle } from '@/components/ui-kit';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { SUBMISSION_TRACKS, SubmissionTrack } from '@/lib/submission-track';
import { CREATIVE_CAMPAIGN_MANIFESTO, CREATIVE_CAMPAIGN_THEMES, isCreativeCampaignTheme } from '@/lib/creative-campaign';
import { withLang } from '@/lib/lang';

export default function SubmitPage() {
  const [lang, setLang] = useState(getSiteLang());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setLang(getSiteLang(params.get('lang')));
      const track = params.get('track');
      if (track === 'academic' || track === 'entertainment') {
        setSubmissionTrack(track);
      }
      const theme = params.get('campaign_theme');
      if (isCreativeCampaignTheme(theme)) {
        setCampaignTheme(theme);
      }
    }
  }, []);
  const copy = useMemo(() => getSiteCopy(lang), [lang]);
  const agreement = useMemo(() => getAuthorAgreement(lang), [lang]);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submissionTrack, setSubmissionTrack] = useState<SubmissionTrack>(SUBMISSION_TRACKS[0]);
  const [discipline, setDiscipline] = useState<string>('Mathematics');
  const [campaignTheme, setCampaignTheme] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [orcidId, setOrcidId] = useState<string | null>(null);

  const disciplineOptions = useMemo(() => getDisciplineOptions(submissionTrack), [submissionTrack]);
  const articleTypeOptions = useMemo(() => getArticleTypeOptions(submissionTrack), [submissionTrack]);
  const topicOptions = useMemo(() => getTopicOptions(discipline, submissionTrack), [discipline, submissionTrack]);

  useEffect(() => {
    const firstDiscipline = disciplineOptions[0]?.value;
    if (!firstDiscipline) return;
    if (!disciplineOptions.some((item) => item.value === discipline)) {
      setDiscipline(firstDiscipline);
    }
  }, [disciplineOptions, discipline]);

  useEffect(() => {
    async function loadSessionIdentity() {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: null }));
      if (response.ok && body.data) {
        if (body.data.email) setUserEmail(body.data.email);
        if (body.data.id) setUserId(body.data.id);
        return;
      }

      const raw = localStorage.getItem('if_user');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { email?: string; id?: string };
      if (parsed.email) setUserEmail(parsed.email);
      if (parsed.id) setUserId(parsed.id);
    }

    void loadSessionIdentity();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    async function loadOrcid() {
      if (!userEmail && !userId) return;

      const query = new URLSearchParams();
      if (userId) query.set('user_id', userId);
      if (userEmail) query.set('email', userEmail);

      const response = await fetch(`/api/orcid/status?${query.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: null }));
      setOrcidId(body.data?.orcid_id ?? null);
    }

    void loadOrcid();

    const onFocus = () => {
      void loadOrcid();
    };

    if (userEmail || userId) {
      timer = setInterval(() => {
        void loadOrcid();
      }, 10000);
      window.addEventListener('focus', onFocus);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      window.removeEventListener('focus', onFocus);
    };
  }, [userEmail, userId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set('terms_version', TERMS_VERSION);
    formData.set('submission_track', submissionTrack);
    if (campaignTheme) {
      formData.set('campaign_theme', campaignTheme);
    }

    const response = await fetch('/api/submissions/complete', {
      method: 'POST',
      body: formData
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (!response.ok) {
      setMessage(`${copy.submit.failedPrefix}${body.error ?? (lang === 'zh' ? '请检查必填字段。' : 'Please review required fields.')}`);
      setLoading(false);
      return;
    }

    const warningText = Array.isArray(body.warnings) && body.warnings.length > 0 ? ` ${copy.submit.warningPrefix}${body.warnings.join(' | ')}` : '';
    setMessage(`${copy.submit.success}${warningText}`);
    formElement.reset();
    setSubmissionTrack(SUBMISSION_TRACKS[0]);
    setDiscipline(getDisciplineOptions('academic')[0]?.value ?? 'Mathematics');
    setCampaignTheme('');
    setLoading(false);
  }

  const trackHint = submissionTrack === 'academic' ? copy.submit.trackAcademicHint : copy.submit.trackEntertainmentHint;
  const versionPolicy = submissionTrack === 'academic' ? copy.submit.versionPolicyAcademic : copy.submit.versionPolicyEntertainment;
  const rightsPolicy = submissionTrack === 'academic' ? copy.submit.rightsPolicyAcademic : copy.submit.rightsPolicyEntertainment;

  return (
    <main>
      <SiteHeader />
      <SectionTitle title={copy.submit.title} subtitle={copy.submit.subtitle} />

      <section className="mt-6 glass-panel p-6">
        <h3 className="font-serif text-2xl">{copy.submit.workflowTitle}</h3>
        <div className="mt-4 grid gap-2 lg:grid-cols-5">
          {copy.submit.steps.map((item, idx) => (
            <div key={item} className="rounded-lg border border-zinc-200 bg-white/85 px-3 py-3 text-sm text-zinc-700">
              <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] text-white">{idx + 1}</span>
              <p className="leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <form className="mt-6 grid gap-5 glass-panel p-6" onSubmit={onSubmit}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">{copy.submit.draftHint}</div>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">{copy.submit.authorIdentity}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              required
              name="user_email"
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              type="email"
              placeholder={copy.submit.yourEmail}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
            <input type="hidden" name="user_id" value={userId} readOnly />

            {orcidId ? (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {copy.submit.authorOrcid}: <span className="font-semibold">{orcidId}</span>
              </p>
            ) : (
              <a className="btn btn-secondary justify-center" href={withLang('/account', lang)}>
                {copy.submit.manageOrcid}
              </a>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">{copy.submit.agreement}</h3>
          <p className="mt-1 text-xs text-zinc-600">{copy.submit.termsVersion}: {TERMS_VERSION}</p>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
            <h4 className="font-semibold text-zinc-900">{agreement.overview.title}</h4>
            <p className="mt-2 text-sm text-zinc-700">{agreement.overview.subtitle}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
              {agreement.overview.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {agreement.sections.map((block) => (
              <article key={block.title} className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-zinc-900">{block.title}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                  {block.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-950">
            <p className="font-semibold">{lang === 'zh' ? '勾选确认前，请再次确认：' : 'Before checking the confirmations below, please make sure that:'}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {agreement.checkboxes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex gap-2">
              <input required type="checkbox" name="author_warranty" value="true" />
              <span>{agreement.checkboxes[0]}</span>
            </label>
            <label className="flex gap-2">
              <input required type="checkbox" name="originality_warranty" value="true" />
              <span>{agreement.checkboxes[1]}</span>
            </label>
            <label className="flex gap-2">
              <input required type="checkbox" name="ethics_warranty" value="true" />
              <span>{agreement.checkboxes[2]}</span>
            </label>
            <label className="flex gap-2">
              <input required type="checkbox" name="privacy_ack" value="true" />
              <span>{agreement.checkboxes[3]}</span>
            </label>
            <label className="mt-1 flex gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-3">
              <input required type="checkbox" name="protocol_ack" value="true" />
              <span>{agreement.overview.protocolAck}</span>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">{copy.submit.metadata}</h3>

          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-start">
              <label className="grid gap-1 text-sm">
                {copy.submit.submissionTrack}
                <select
                  name="submission_track"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  value={submissionTrack}
                  onChange={(event) => setSubmissionTrack(event.target.value as SubmissionTrack)}
                >
                  <option value="academic">{copy.submit.trackAcademic}</option>
                  <option value="entertainment">{copy.submit.trackEntertainment}</option>
                </select>
              </label>

              <div className="space-y-2 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{trackHint}</p>
                <p>{versionPolicy}</p>
                <p>{rightsPolicy}</p>
              </div>
            </div>
          </div>

          <div className="mt-2 grid gap-3">
            {submissionTrack === 'entertainment' ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 px-4 py-4">
                <p className="text-sm font-semibold text-purple-950">{lang === 'zh' ? '自由创作区首期双主题征稿' : 'Creative Track First Call for Submissions'}</p>
                <p className="mt-2 text-sm text-purple-900">{CREATIVE_CAMPAIGN_MANIFESTO[lang]}</p>
                <label className="mt-3 grid gap-1 text-sm">
                  {lang === 'zh' ? '活动主题（可选）' : 'Campaign theme (optional)'}
                  <select
                    name="campaign_theme"
                    className="rounded-lg border border-zinc-300 px-3 py-2"
                    value={campaignTheme}
                    onChange={(event) => setCampaignTheme(event.target.value)}
                  >
                    <option value="">{lang === 'zh' ? '不指定主题' : 'No specific theme'}</option>
                    {CREATIVE_CAMPAIGN_THEMES.map((theme) => (
                      <option key={theme.slug} value={theme.slug}>
                        {theme.title[lang]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <input required name="title" placeholder={copy.submit.titleField} className="rounded-lg border border-zinc-300 px-3 py-2" />
            <input required name="authors" placeholder={copy.submit.authorsField} className="rounded-lg border border-zinc-300 px-3 py-2" />

            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                {copy.submit.discipline}
                <select name="discipline" className="rounded-lg border border-zinc-300 px-3 py-2" value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
                  {disciplineOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {getTaxonomyLabel(item.value, lang, 'discipline')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                {copy.submit.topic}
                <select
                  key={`${submissionTrack}-${discipline}`}
                  name="topic"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  defaultValue={topicOptions[0]?.value ?? ''}
                >
                  {topicOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label[lang]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                {copy.submit.articleType}
                <select key={submissionTrack} name="article_type" className="rounded-lg border border-zinc-300 px-3 py-2" defaultValue={articleTypeOptions[0]?.value ?? ''}>
                  {articleTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label[lang]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea name="abstract" placeholder={copy.submit.abstractField} rows={5} className="rounded-lg border border-zinc-300 px-3 py-2" />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <h3 className="font-semibold">{copy.submit.upload}</h3>
          <div className="mt-2 grid gap-3">
            <label className="grid gap-1 text-sm">
              {copy.submit.manuscript}
              <input required name="manuscript" type="file" accept="application/pdf" className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm">
              {copy.submit.coverLetter}
              <input required name="cover_letter" type="file" accept="application/pdf,.doc,.docx,.txt" className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm">
              {copy.submit.supporting}
              <input name="supporting_files" type="file" multiple className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? copy.submit.submitting : copy.submit.submitButton}
          </button>
          <p className="text-sm text-zinc-600">{copy.submit.eta}</p>
        </div>

        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>
    </main>
  );
}
