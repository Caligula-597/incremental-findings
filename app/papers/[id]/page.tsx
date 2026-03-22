import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/header';
import { getSubmissionById } from '@/lib/submission-repository';
import { isResolvableDoi } from '@/lib/doi';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { getSubmissionTrack, getSubmissionTrackDoiNote, getSubmissionTrackLabel } from '@/lib/submission-track';
import { withLang } from '@/lib/lang';

interface PaperPageProps {
  params: { id: string };
  searchParams?: { lang?: string };
}

export async function generateMetadata({ params, searchParams }: PaperPageProps): Promise<Metadata> {
  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);
  const paper = await getSubmissionById(params.id);
  if (!paper || paper.status !== 'published') {
    return { title: copy.paperDetail.notFound };
  }

  const title = `${paper.title} · Incremental Findings`;
  const description = (paper.abstract ?? (lang === 'zh' ? '已发布研究论文' : 'Published research article')).slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article'
    }
  };
}

export default async function PaperDetailPage({ params, searchParams }: PaperPageProps) {
  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);
  const paper = await getSubmissionById(params.id);
  if (!paper || paper.status !== 'published') {
    notFound();
  }

  const citationAuthor = paper.authors
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const track = getSubmissionTrack(paper);
  const doiLabel = isResolvableDoi(paper.doi) ? 'DOI' : lang === 'zh' ? '发布编号' : 'Publication ID';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.title,
    author: citationAuthor.map((name) => ({ '@type': 'Person', name })),
    datePublished: paper.created_at,
    identifier: isResolvableDoi(paper.doi) ? `https://doi.org/${paper.doi}` : paper.doi ?? paper.id,
    url: paper.file_url ?? undefined,
    abstract: paper.abstract ?? undefined,
    about: [getSubmissionTrackLabel(track, lang), paper.discipline, paper.topic, paper.article_type].filter(Boolean)
  };

  return (
    <main>
      <SiteHeader />
      <article className="glass-panel p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{copy.paperDetail.publishedArticle}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">{paper.title}</h1>
        <p className="mt-3 text-sm text-zinc-600">{paper.authors}</p>
        <p className="mt-2 text-sm font-semibold text-zinc-700">{getSubmissionTrackLabel(track, lang)}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {paper.discipline ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.discipline}</span> : null}
          {paper.topic ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.topic}</span> : null}
          {paper.article_type ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.article_type}</span> : null}
        </div>

        {paper.doi ? (
          <p className="mt-4 text-sm text-zinc-700">
            {doiLabel}:{' '}
            {isResolvableDoi(paper.doi) ? (
              <a className="underline" href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
                {paper.doi}
              </a>
            ) : (
              <span>{paper.doi}</span>
            )}
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">{track === 'entertainment' ? copy.paperDetail.entertainmentNote : copy.paperDetail.doiPending}</p>
        )}

        <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
          <h2 className="font-semibold text-zinc-900">{copy.paperDetail.versionHistory}</h2>
          <p className="mt-2">{track === 'entertainment' ? copy.paperDetail.versionHistoryEntertainment : copy.paperDetail.versionHistoryAcademic}</p>
          {!paper.doi ? <p className="mt-2">{getSubmissionTrackDoiNote(track, lang)}</p> : null}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold">{copy.paperDetail.abstract}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{paper.abstract ?? copy.paperDetail.noAbstract}</p>
        </section>

        <div className="mt-7 flex flex-wrap gap-3">
          <a className="btn btn-primary" href={paper.file_url ?? '#'} target="_blank" rel="noreferrer">
            {copy.paperDetail.viewPdf}
          </a>
          <a className="btn btn-secondary" href={`/api/public/submissions/${paper.id}/citation?format=bibtex`}>
            {copy.paperDetail.downloadBibtex}
          </a>
          <Link className="btn btn-secondary" href={withLang('/', lang)}>
            {copy.paperDetail.backToDiscovery}
          </Link>
        </div>
      </article>

      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
