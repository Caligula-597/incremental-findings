'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { isResolvableDoi } from '@/lib/doi';
import { MetricCard, SectionTitle, StatusPill } from '@/components/ui-kit';
import { DISCIPLINES } from '@/lib/taxonomy';
import { Submission } from '@/lib/types';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { withLang } from '@/lib/lang';

interface ReviewBoardRow {
  recommendation_count: number;
  can_finalize: boolean;
  final_decision: { final_decision: string; summary: string; created_at: string; managing_editor_email: string } | null;
  recommendations: Array<{ editor_email: string; recommendation: string; comment: string; created_at: string }>;
}

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

interface EditorAssignment {
  id: string;
  submission_id: string;
  assigned_editor_email: string;
  assigned_by_email: string;
  created_at: string;
}

interface EditorialRosterRow {
  email: string;
  role: 'managing_editor' | 'review_editor';
  source: string;
}

interface SessionPayload {
  id?: string;
  email: string;
  name: string;
  role: 'author' | 'editor';
  editor_role?: 'managing_editor' | 'review_editor' | null;
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

  const [underReview, setUnderReview] = useState<Submission[]>([]);
  const [accepted, setAccepted] = useState<Submission[]>([]);
  const [inProduction, setInProduction] = useState<Submission[]>([]);
  const [published, setPublished] = useState<Submission[]>([]);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [isEditor, setIsEditor] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [editorRole, setEditorRole] = useState<'managing_editor' | 'review_editor' | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionPayload | null>(null);
  const [applications, setApplications] = useState<EditorApplication[]>([]);
  const [history, setHistory] = useState<EditorHistoryItem[]>([]);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [reviewBoard, setReviewBoard] = useState<Record<string, ReviewBoardRow>>({});
  const [assignments, setAssignments] = useState<Record<string, EditorAssignment[]>>({});
  const [roster, setRoster] = useState<EditorialRosterRow[]>([]);
  const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({});
  const [packageUrls, setPackageUrls] = useState<Record<string, string>>({});

  const isManagingEditor = editorRole === 'managing_editor';

  async function loadReviewBoard(submissionIds: string[]) {
    if (submissionIds.length === 0) {
      setReviewBoard({});
      return;
    }
    const query = submissionIds.map((id) => `submission_id=${encodeURIComponent(id)}`).join('&');
    const response = await fetch(`/api/editor/review-board?${query}`, { cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json().catch(() => ({ data: {} }));
    setReviewBoard(body.data ?? {});
  }

  async function loadAssignments(submissionIds: string[]) {
    const query = submissionIds.map((id) => `submission_id=${encodeURIComponent(id)}`).join('&');
    const url = query ? `/api/editor/assignments?${query}` : '/api/editor/assignments';
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json().catch(() => ({ data: { assignments: {}, roster: [], editor_role: null } }));
    setAssignments(body.data?.assignments ?? {});
    setRoster(body.data?.roster ?? []);
    if (body.data?.editor_role) {
      setEditorRole(body.data.editor_role);
    }
  }

  async function loadData() {
    const [reviewRes, acceptedRes, productionRes, publishedRes] = await Promise.all([
      fetch('/api/submissions?status=under_review&include_files=true', { cache: 'no-store' }),
      fetch('/api/submissions?status=accepted&include_files=true', { cache: 'no-store' }),
      fetch('/api/submissions?status=in_production&include_files=true', { cache: 'no-store' }),
      fetch('/api/submissions?status=published&include_files=true', { cache: 'no-store' })
    ]);

    if (!reviewRes.ok || !acceptedRes.ok || !productionRes.ok || !publishedRes.ok) {
      const detail = await reviewRes.json().catch(() => ({ error: 'Unable to load editorial queues' }));
      setMessage(`${lang === 'zh' ? '加载失败：' : 'Load failed: '}${detail.error ?? 'Unknown error'}`);
      return;
    }

    const reviewJson = await reviewRes.json();
    const acceptedJson = await acceptedRes.json();
    const productionJson = await productionRes.json();
    const publishedJson = await publishedRes.json();

    const reviewData = reviewJson.data ?? [];
    const acceptedData = acceptedJson.data ?? [];
    const productionData = productionJson.data ?? [];
    const publishedData = publishedJson.data ?? [];

    setUnderReview(reviewData);
    setAccepted(acceptedData);
    setInProduction(productionData);
    setPublished(publishedData);
    await Promise.all([loadReviewBoard(reviewData.map((item: Submission) => item.id)), loadAssignments(reviewData.map((item: Submission) => item.id))]);
  }

  async function loadApplications() {
    if (!isManagingEditor) return;
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

  async function reloadWorkspace() {
    await Promise.all([loadData(), loadHistory(), isManagingEditor ? loadApplications() : Promise.resolve()]);
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
      setMessage(`${lang === 'zh' ? '邀请失败：' : 'Invite failed: '}${body.error ?? ''}`);
      return;
    }

    const code = body?.data?.invite_code;
    setMessage(code ? `${lang === 'zh' ? '已生成邀请访问码（请发送给编辑）：' : 'Invite code created: '}${code}` : lang === 'zh' ? '邀请已创建。' : 'Invite created.');
    await Promise.all([loadApplications(), loadAssignments(underReview.map((item) => item.id))]);
  }

  async function assignEditor(submissionId: string) {
    setMessage('');
    const assignedEditorEmail = (assignmentTargets[submissionId] ?? '').trim().toLowerCase();
    if (!assignedEditorEmail) {
      setMessage(lang === 'zh' ? '请先选择或输入审稿编辑邮箱。' : 'Please choose or enter a review editor email first.');
      return;
    }

    const response = await fetch('/api/editor/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, assigned_editor_email: assignedEditorEmail })
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${lang === 'zh' ? '分配失败：' : 'Assignment failed: '}${body.error ?? ''}`);
      return;
    }

    setAssignmentTargets((prev) => ({ ...prev, [submissionId]: '' }));
    setMessage(lang === 'zh' ? `已分配稿件给 ${assignedEditorEmail}` : `Assigned manuscript to ${assignedEditorEmail}`);
    await Promise.all([loadAssignments(underReview.map((item) => item.id)), loadHistory()]);
  }

  async function submitRecommendation(id: string, recommendation: 'accept' | 'major_revision' | 'minor_revision' | 'reject') {
    setMessage('');
    const comment = (responseNotes[id] ?? '').trim();
    const response = await fetch('/api/editor/review-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: id, recommendation, comment })
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${lang === 'zh' ? '提交失败：' : 'Submit failed: '}${body.error ?? ''}`);
      return;
    }

    setMessage(lang === 'zh' ? `已提交审稿编辑意见：${recommendation}` : `Recommendation submitted: ${recommendation}`);
    await Promise.all([loadReviewBoard(underReview.map((item) => item.id)), loadHistory()]);
  }

  async function finalizeDecision(id: string, finalDecision: 'accept' | 'major_revision' | 'minor_revision' | 'reject') {
    setMessage('');
    const summary = (responseNotes[id] ?? '').trim();
    const response = await fetch('/api/editor/review-board/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: id, final_decision: finalDecision, summary })
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${lang === 'zh' ? '最终决定失败：' : 'Final decision failed: '}${body.error ?? ''}`);
      return;
    }

    setMessage(lang === 'zh' ? `行政编辑最终决定：${finalDecision}` : `Managing editor finalized: ${finalDecision}`);
    await reloadWorkspace();
  }

  async function startProduction(id: string) {
    setMessage('');
    const note = (responseNotes[id] ?? '').trim();
    const response = await fetch(`/api/production/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${lang === 'zh' ? '进入制作失败：' : 'Failed to start production: '}${body.error ?? ''}`);
      return;
    }

    setMessage(lang === 'zh' ? '稿件已进入制作阶段。' : 'Submission moved into production.');
    await reloadWorkspace();
  }

  async function publishPackage(id: string) {
    setMessage('');
    const packageUrl = (packageUrls[id] ?? '').trim();
    const note = (responseNotes[id] ?? '').trim();
    if (!packageUrl) {
      setMessage(lang === 'zh' ? '请填写制作包地址。' : 'Please provide the publication package URL.');
      return;
    }

    const response = await fetch(`/api/production/${id}/publish-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_url: packageUrl, note })
    });
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${lang === 'zh' ? '发布失败：' : 'Publish failed: '}${body.error ?? ''}`);
      return;
    }

    setMessage(lang === 'zh' ? '稿件已发布。' : 'Submission published.');
    await reloadWorkspace();
  }

  async function assignDoi(id: string) {
    setMessage('');
    const response = await fetch(`/api/submissions/${id}/doi`, { method: 'POST' });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${lang === 'zh' ? '编号分配失败：' : 'Identifier assignment failed: '}${body.error ?? ''}`);
      return;
    }

    const doiValue = body?.data?.doi as string | undefined;
    setMessage(doiValue ? `${lang === 'zh' ? '发布编号已分配：' : 'Publication identifier assigned: '}${doiValue}` : lang === 'zh' ? '编号分配完成。' : 'Identifier assigned.');
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
      const payload = sessionBody?.data as SessionPayload | null;
      if (sessionRes.ok && payload?.role === 'editor') {
        setSessionUser(payload);
        setEditorRole(payload.editor_role ?? null);
        setIsEditor(true);
      }
      setCheckingSession(false);
    }

    void boot();
  }, []);

  useEffect(() => {
    if (!isEditor || !editorRole) return;
    void reloadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditor, editorRole]);

  const filteredUnderReview = useMemo(
    () => underReview.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [underReview, query, disciplineFilter]
  );
  const filteredAccepted = useMemo(
    () => accepted.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [accepted, query, disciplineFilter]
  );
  const filteredInProduction = useMemo(
    () => inProduction.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [inProduction, query, disciplineFilter]
  );
  const filteredPublished = useMemo(
    () => published.filter((item) => matchesFilter(item, query, disciplineFilter)),
    [published, query, disciplineFilter]
  );
  const reviewEditors = useMemo(() => roster.filter((entry) => entry.role === 'review_editor'), [roster]);
  const totalActive = useMemo(() => underReview.length + accepted.length + inProduction.length, [underReview.length, accepted.length, inProduction.length]);

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
          <p className="mt-3 max-w-2xl text-sm text-zinc-700">{copy.editor.loginRequiredDesc}</p>
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
        title={lang === 'zh' ? '编辑工作台' : 'Editorial workspace'}
        subtitle={
          isManagingEditor
            ? (lang === 'zh'
              ? '行政编辑：使用环境编辑码进入，负责审核审稿编辑申请、发放邀请码、分配稿件并做最终决定。'
              : 'Managing editor: enter with the managing-editor access code, approve review-editor applications, issue invites, assign manuscripts, and make final decisions.')
            : (lang === 'zh'
              ? '审稿编辑：只查看分配给自己的稿件、下载文件并提交接受/小修/大修/拒稿意见。'
              : 'Review editor: only see manuscripts assigned to you, open files, and submit accept/minor revision/major revision/reject recommendations.')
        }
      />

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <MetricCard label={lang === 'zh' ? '审稿中' : 'Under review'} value={underReview.length} />
        <MetricCard label={lang === 'zh' ? '已接收' : 'Accepted'} value={accepted.length} />
        <MetricCard label={lang === 'zh' ? '制作中' : 'In production'} value={inProduction.length} />
        <MetricCard label={lang === 'zh' ? '活跃队列' : 'Active queue'} value={totalActive} />
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
          <button type="button" onClick={() => { setQuery(''); setDisciplineFilter('all'); }} className="btn btn-secondary">
            {copy.editor.resetFilters}
          </button>
        </div>
      </section>

      <section className="glass-panel mb-6 p-4 text-sm text-zinc-700">
        <p>
          {lang === 'zh' ? '当前登录：' : 'Signed in as: '}
          <span className="font-semibold">{sessionUser?.email}</span>
          {' · '}
          <span>{isManagingEditor ? (lang === 'zh' ? '行政编辑' : 'Managing editor') : (lang === 'zh' ? '审稿编辑' : 'Review editor')}</span>
        </p>
      </section>

      {message ? <p className="mb-4 text-sm text-zinc-700">{message}</p> : null}

      {isManagingEditor ? (
        <section className="mt-6">
          <SectionTitle title={lang === 'zh' ? '编辑列表与邀请' : 'Editor roster & invites'} subtitle={lang === 'zh' ? '行政编辑可以查看当前编辑列表，并处理审稿编辑申请。' : 'Managing editors can review the editorial roster and process review-editor applications.'} />
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="glass-panel p-4">
              <h4 className="font-serif text-xl">{lang === 'zh' ? '编辑列表' : 'Editorial roster'}</h4>
              <div className="mt-3 grid gap-3">
                {roster.length === 0 ? <p className="text-sm text-zinc-600">{lang === 'zh' ? '暂无编辑记录。' : 'No editor records yet.'}</p> : null}
                {roster.map((entry) => (
                  <article key={entry.email} className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{entry.email}</p>
                      <StatusPill status={entry.role === 'managing_editor' ? 'accepted' : 'under_review'} />
                    </div>
                    <p className="mt-1 text-zinc-700">{entry.role === 'managing_editor' ? (lang === 'zh' ? '行政编辑' : 'Managing editor') : (lang === 'zh' ? '审稿编辑' : 'Review editor')}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="glass-panel p-4">
              <h4 className="font-serif text-xl">{lang === 'zh' ? '待处理审稿编辑申请' : 'Pending review-editor applications'}</h4>
              <div className="mt-3 grid gap-3">
                {applications.length === 0 ? <p className="text-sm text-zinc-600">{copy.editor.noPendingApplications}</p> : null}
                {applications.map((application) => (
                  <article key={application.id} className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm">
                    <p className="font-semibold">{application.applicant_name}</p>
                    <p className="text-zinc-600">{application.applicant_email}</p>
                    <p className="mt-2 text-zinc-700">{application.statement}</p>
                    <button className="btn btn-secondary btn-sm mt-3" onClick={() => inviteApplicant(application)}>
                      {copy.editor.approveAndInvite}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionTitle title={lang === 'zh' ? '审稿中稿件' : 'Under-review manuscripts'} subtitle={isManagingEditor ? (lang === 'zh' ? '分配审稿编辑、收集意见并做最终决定。' : 'Assign review editors, collect recommendations, and make final decisions.') : (lang === 'zh' ? '这里只显示分配给你的稿件。' : 'Only manuscripts assigned to you appear here.')} />
        <div className="mt-4 grid gap-4">
          {filteredUnderReview.length === 0 ? <p>{lang === 'zh' ? '暂无审稿中稿件。' : 'No under-review manuscripts.'}</p> : null}
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
              <p className="mt-2 text-sm">{(item.abstract ?? copy.editor.noAbstract).slice(0, 300)}...</p>

              {isManagingEditor ? (
                <div className="mt-4 grid gap-3 rounded-md border border-zinc-200 bg-white/80 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">{lang === 'zh' ? '已分配审稿编辑' : 'Assigned review editors'}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                      {(assignments[item.id] ?? []).length === 0 ? <span className="text-zinc-500">{lang === 'zh' ? '尚未分配' : 'Not assigned yet'}</span> : null}
                      {(assignments[item.id] ?? []).map((entry) => (
                        <span key={entry.id} className="rounded-full border border-zinc-300 px-3 py-1">{entry.assigned_editor_email}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={assignmentTargets[item.id] ?? ''}
                      onChange={(event) => setAssignmentTargets((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      <option value="">{lang === 'zh' ? '选择审稿编辑' : 'Select a review editor'}</option>
                      {reviewEditors.map((entry) => (
                        <option key={entry.email} value={entry.email}>{entry.email}</option>
                      ))}
                    </select>
                    <input
                      value={assignmentTargets[item.id] ?? ''}
                      onChange={(event) => setAssignmentTargets((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      placeholder={lang === 'zh' ? '或直接输入邮箱' : 'Or type an email'}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <button className="btn btn-secondary" onClick={() => assignEditor(item.id)}>
                      {lang === 'zh' ? '分配稿件' : 'Assign manuscript'}
                    </button>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">{lang === 'zh' ? '已收集意见' : 'Collected recommendations'}</p>
                    <div className="mt-2 grid gap-2">
                      {(reviewBoard[item.id]?.recommendations ?? []).length === 0 ? <p className="text-sm text-zinc-500">{lang === 'zh' ? '暂无审稿编辑意见。' : 'No review editor recommendations yet.'}</p> : null}
                      {(reviewBoard[item.id]?.recommendations ?? []).map((entry) => (
                        <div key={`${entry.editor_email}-${entry.created_at}`} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                          <p className="font-semibold">{entry.editor_email}</p>
                          <p className="text-zinc-600">{entry.recommendation} · {new Date(entry.created_at).toLocaleString()}</p>
                          <p className="mt-1 text-zinc-700">{entry.comment || (lang === 'zh' ? '无附加意见' : 'No additional comment')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={responseNotes[item.id] ?? ''}
                    onChange={(event) => setResponseNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    rows={3}
                    placeholder={lang === 'zh' ? '填写给作者的最终决定摘要（小修/大修时可说明要求）' : 'Write the final decision summary for the author.'}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => finalizeDecision(item.id, 'accept')}>{lang === 'zh' ? '最终决定：接收' : 'Finalize accept'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => finalizeDecision(item.id, 'minor_revision')}>{lang === 'zh' ? '最终决定：小修' : 'Finalize minor revision'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => finalizeDecision(item.id, 'major_revision')}>{lang === 'zh' ? '最终决定：大修' : 'Finalize major revision'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => finalizeDecision(item.id, 'reject')}>{lang === 'zh' ? '最终决定：拒稿' : 'Finalize reject'}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 rounded-md border border-zinc-200 bg-white/80 p-3">
                  <textarea
                    value={responseNotes[item.id] ?? ''}
                    onChange={(event) => setResponseNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    rows={4}
                    placeholder={lang === 'zh' ? '写审稿意见，行政编辑将据此做最终决定。' : 'Write your recommendation for the managing editor.'}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => submitRecommendation(item.id, 'accept')}>{lang === 'zh' ? '接受' : 'Accept'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => submitRecommendation(item.id, 'minor_revision')}>{lang === 'zh' ? '小修' : 'Minor revision'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => submitRecommendation(item.id, 'major_revision')}>{lang === 'zh' ? '大修' : 'Major revision'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => submitRecommendation(item.id, 'reject')}>{lang === 'zh' ? '拒稿' : 'Reject'}</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {isManagingEditor ? (
        <>
          <section className="mt-10">
            <SectionTitle title={lang === 'zh' ? '已接收稿件' : 'Accepted manuscripts'} subtitle={lang === 'zh' ? '接收后进入 accepted，行政编辑可推进到 in_production。' : 'Accepted manuscripts can now be moved into production.'} />
            <div className="mt-4 grid gap-4">
              {filteredAccepted.length === 0 ? <p>{lang === 'zh' ? '暂无已接收稿件。' : 'No accepted manuscripts.'}</p> : null}
              {filteredAccepted.map((item) => (
                <article key={item.id} className="glass-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-serif text-xl">{item.title}</h4>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
                  <TaxonomyMeta item={item} unclassified={copy.editor.unclassified} />
                  <textarea
                    value={responseNotes[item.id] ?? ''}
                    onChange={(event) => setResponseNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    rows={3}
                    placeholder={lang === 'zh' ? '可填写制作备注（可选）' : 'Optional production note'}
                    className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => startProduction(item.id)}>{lang === 'zh' ? '进入制作' : 'Start production'}</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <SectionTitle title={lang === 'zh' ? '制作中稿件' : 'In-production manuscripts'} subtitle={lang === 'zh' ? '填写制作包地址后发布，状态将进入 published。' : 'Provide a production package URL to publish the manuscript.'} />
            <div className="mt-4 grid gap-4">
              {filteredInProduction.length === 0 ? <p>{lang === 'zh' ? '暂无制作中稿件。' : 'No in-production manuscripts.'}</p> : null}
              {filteredInProduction.map((item) => (
                <article key={item.id} className="glass-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-serif text-xl">{item.title}</h4>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{item.authors}</p>
                  <TaxonomyMeta item={item} unclassified={copy.editor.unclassified} />
                  <div className="mt-3 grid gap-2">
                    <input
                      value={packageUrls[item.id] ?? ''}
                      onChange={(event) => setPackageUrls((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      placeholder={lang === 'zh' ? '填写发布包 URL' : 'Publication package URL'}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={responseNotes[item.id] ?? ''}
                      onChange={(event) => setResponseNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      rows={3}
                      placeholder={lang === 'zh' ? '发布备注（可选）' : 'Optional publication note'}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => publishPackage(item.id)}>{lang === 'zh' ? '发布稿件' : 'Publish manuscript'}</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <SectionTitle title={copy.editor.publishedWork} subtitle={lang === 'zh' ? '发表后会显示在首页 /、公开列表 API /api/public/submissions、公开详情页 /papers/[id]，以及本工作台的 Published 区域。' : 'After publication, papers appear on /, the public list API /api/public/submissions, the public detail page /papers/[id], and this Published section.'} />
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
                        <a className="text-xs font-semibold text-zinc-700 underline" href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">
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
                    <Link className="text-sm underline" href={`/papers/${item.id}`}>
                      {lang === 'zh' ? '公开详情页' : 'Public detail page'}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="mt-10">
        <SectionTitle title={lang === 'zh' ? '编辑历史' : 'Editorial history'} subtitle={lang === 'zh' ? '查看你最近阅读和处理过的稿件。' : 'Track the manuscripts you recently handled.'} />
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
