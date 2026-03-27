'use client';

import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { getSiteLang } from '@/lib/site-copy';
import { withLang } from '@/lib/lang';

type SubmissionDetail = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  authors: string;
  discipline?: string | null;
  category?: string | null;
  article_type?: string | null;
  topic?: string | null;
  abstract?: string | null;
  doi?: string | null;
  files?: Array<{ id: string; file_kind: string; file_name: string }>;
};

export default function AccountSubmissionDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { lang?: string } }) {
  const lang = useMemo(() => getSiteLang(searchParams?.lang), [searchParams?.lang]);
  const [item, setItem] = useState<SubmissionDetail | null>(null);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/submissions/mine?include_files=true', { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: [] }));
      if (!response.ok) {
        setMessage(body.error ?? (lang === 'zh' ? '加载失败。' : 'Load failed.'));
        return;
      }
      const found = (body.data ?? []).find((entry: SubmissionDetail) => entry.id === params.id) ?? null;
      if (!found) {
        setMessage(lang === 'zh' ? '未找到该投稿记录。' : 'Submission record not found.');
      }
      setItem(found);
    }

    void load();
  }, [lang, params.id]);

  async function deleteSubmission() {
    if (!item) return;
    const ok = window.confirm(lang === 'zh' ? '确认删除该投稿记录？该功能目前仅用于调试。' : 'Delete this submission record? This feature is currently for debugging only.');
    if (!ok) return;

    setDeleting(true);
    setMessage('');
    const response = await fetch(`/api/submissions/${item.id}`, { method: 'DELETE' });
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(body.error ?? (lang === 'zh' ? '删除失败。' : 'Delete failed.'));
      setDeleting(false);
      return;
    }

    window.location.href = withLang('/account', lang);
  }

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={lang === 'zh' ? '投稿详情' : 'Submission details'}
        subtitle={lang === 'zh' ? '查看本次投稿填写信息、审核状态与已上传文件。' : 'Review metadata, status, and uploaded files for this submission.'}
      />

      <section className="glass-panel p-6 text-sm">
        <a className="underline" href={withLang('/account', lang)}>
          {lang === 'zh' ? '← 返回账户页' : '← Back to account'}
        </a>

        {item ? (
          <div className="mt-2">
            <a className="underline" href={withLang(`/account/submissions/${item.id}/timeline`, lang)}>
              {lang === 'zh' ? '查看稿件时间线 →' : 'View timeline →'}
            </a>
          </div>
        ) : null}

        {!item ? <p className="mt-4 text-zinc-700">{message || (lang === 'zh' ? '加载中…' : 'Loading…')}</p> : null}

        {item ? (
          <div className="mt-4 space-y-2 text-zinc-800">
            <p className="text-xl font-semibold">{item.title}</p>
            <p>{lang === 'zh' ? '状态' : 'Status'}: {item.status}</p>
            <p>{lang === 'zh' ? '创建时间' : 'Created at'}: {new Date(item.created_at).toLocaleString()}</p>
            <p>{lang === 'zh' ? '作者' : 'Authors'}: {item.authors}</p>
            <p>{lang === 'zh' ? '分区' : 'Track'}: {item.category === 'entertainment' ? (lang === 'zh' ? '自由创作区' : 'Creative / Entertainment') : (lang === 'zh' ? '学术研讨区' : 'Academic Review Track')}</p>
            <p>{lang === 'zh' ? '学科' : 'Discipline'}: {item.discipline ?? '-'}</p>
            <p>{lang === 'zh' ? '稿件类型' : 'Article type'}: {item.article_type ?? '-'}</p>
            <p>{lang === 'zh' ? '主题' : 'Topic'}: {item.topic ?? '-'}</p>
            <p>{lang === 'zh' ? '摘要' : 'Abstract'}: {item.abstract ?? '-'}</p>
            <p>{lang === 'zh' ? 'DOI/发布编号' : 'DOI/Identifier'}: {item.doi ?? item.id}</p>

            <div className="mt-4">
              <button type="button" className="btn btn-danger btn-sm" onClick={deleteSubmission} disabled={deleting}>
                {deleting ? (lang === 'zh' ? '删除中…' : 'Deleting…') : (lang === 'zh' ? '删除此投稿（调试）' : 'Delete this submission (debug)')}
              </button>
            </div>

            <div className="mt-3">
              <p className="font-semibold">{lang === 'zh' ? '上传文件' : 'Uploaded files'}</p>
              <ul className="mt-1 list-disc pl-5">
                {(item.files ?? []).map((file) => (
                  <li key={file.id}>
                    {file.file_kind}:
                    <a className="ml-1 underline" href={`/api/submissions/files/${file.id}`} target="_blank" rel="noreferrer">
                      {file.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
