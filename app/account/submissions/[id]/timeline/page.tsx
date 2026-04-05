'use client';

import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { getSiteLang } from '@/lib/site-copy';
import { withLang } from '@/lib/lang';

type TimelineEvent = {
  id: string;
  type: 'system' | 'audit';
  action: string;
  title: string;
  detail: string;
  actor_email: string | null;
  created_at: string;
};

type TimelinePayload = {
  submission: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    doi: string | null;
  };
  events: TimelineEvent[];
};

export default function SubmissionTimelinePage({ params, searchParams }: { params: { id: string }; searchParams?: { lang?: string } }) {
  const lang = useMemo(() => getSiteLang(searchParams?.lang), [searchParams?.lang]);
  const [data, setData] = useState<TimelinePayload | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/submissions/${params.id}/timeline`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: null }));
      if (!response.ok) {
        setMessage(body.error ?? (lang === 'zh' ? '加载失败。' : 'Load failed.'));
        return;
      }
      setData(body.data ?? null);
    }

    void load();
  }, [lang, params.id]);

  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={lang === 'zh' ? '稿件时间线' : 'Submission timeline'}
        subtitle={lang === 'zh' ? '查看从投稿到出版的完整流程节点。' : 'Track key milestones from submission to publication.'}
      />

      <section className="glass-panel p-6 text-sm">
        <a className="underline" href={withLang(`/account/submissions/${params.id}`, lang)}>
          {lang === 'zh' ? '← 返回投稿详情' : '← Back to submission details'}
        </a>

        {!data ? <p className="mt-4 text-zinc-700">{message || (lang === 'zh' ? '加载中…' : 'Loading…')}</p> : null}

        {data ? (
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-zinc-900">{data.submission.title}</h2>
            <p className="mt-1 text-zinc-700">
              {lang === 'zh' ? '当前状态' : 'Current status'}: {data.submission.status}
            </p>

            <ol className="mt-6 space-y-3 border-l border-zinc-300 pl-5">
              {data.events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.55rem] top-1 h-2.5 w-2.5 rounded-full bg-[#084f74]" />
                  <div className="rounded border border-zinc-200 bg-white p-3">
                    <p className="font-semibold text-zinc-900">{event.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{new Date(event.created_at).toLocaleString()}</p>
                    <p className="mt-2 text-zinc-700">{event.detail}</p>
                    {event.actor_email ? <p className="mt-1 text-xs text-zinc-500">{event.actor_email}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
    </main>
  );
}
