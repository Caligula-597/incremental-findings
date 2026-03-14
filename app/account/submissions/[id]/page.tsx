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

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/submissions/mine?include_files=true', { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: [] }));
      if (!response.ok) {
        setMessage(body.error ?? 'Load failed');
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

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={lang === 'zh' ? '投稿详情' : 'Submission details'}
        subtitle={lang === 'zh' ? '查看本次投稿填写信息、审核状态与文件。' : 'Review metadata, status and uploaded files for this submission.'}
      />

      <section className="glass-panel p-6 text-sm">
        <a className="underline" href={withLang('/account', lang)}>
          {lang === 'zh' ? '← 返回账户页' : '← Back to account'}
        </a>

        {!item ? <p className="mt-4 text-zinc-700">{message || (lang === 'zh' ? '加载中…' : 'Loading…')}</p> : null}

        {item ? (
          <div className="mt-4 space-y-2 text-zinc-800">
            <p className="text-xl font-semibold">{item.title}</p>
            <p>{lang === 'zh' ? '状态' : 'Status'}: {item.status}</p>
            <p>{lang === 'zh' ? '创建时间' : 'Created at'}: {new Date(item.created_at).toLocaleString()}</p>
            <p>{lang === 'zh' ? '作者' : 'Authors'}: {item.authors}</p>
            <p>{lang === 'zh' ? '学科' : 'Discipline'}: {item.discipline ?? '-'}</p>
            <p>{lang === 'zh' ? '稿件类型' : 'Article type'}: {item.article_type ?? '-'}</p>
            <p>{lang === 'zh' ? '主题' : 'Topic'}: {item.topic ?? '-'}</p>
            <p>{lang === 'zh' ? '摘要' : 'Abstract'}: {item.abstract ?? '-'}</p>
            <p>{lang === 'zh' ? 'DOI/编号' : 'DOI/Identifier'}: {item.doi ?? '-'}</p>

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
