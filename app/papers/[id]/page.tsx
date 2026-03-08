import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/header';
import { getSubmissionById } from '@/lib/submission-repository';

interface PaperPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PaperPageProps): Promise<Metadata> {
  const paper = await getSubmissionById(params.id);
  if (!paper || paper.status !== 'published') {
    return { title: 'Paper not found · Incremental Findings' };
  }

  const title = `${paper.title} · Incremental Findings`;
  const description = (paper.abstract ?? 'Published research article').slice(0, 160);

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

export default async function PaperDetailPage({ params }: PaperPageProps) {
  const paper = await getSubmissionById(params.id);
  if (!paper || paper.status !== 'published') {
    notFound();
  }

  const citationAuthor = paper.authors
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.title,
    author: citationAuthor.map((name) => ({ '@type': 'Person', name })),
    datePublished: paper.created_at,
    identifier: paper.doi ? `https://doi.org/${paper.doi}` : paper.id,
    url: paper.file_url ?? undefined,
    abstract: paper.abstract ?? undefined,
    about: [paper.discipline, paper.topic, paper.article_type].filter(Boolean)
  };

  return (
    <main>
      <SiteHeader />
      <article className="glass-panel p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Published paper</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">{paper.title}</h1>
        <p className="mt-3 text-sm text-zinc-600">{paper.authors}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {paper.discipline ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.discipline}</span> : null}
          {paper.topic ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.topic}</span> : null}
          {paper.article_type ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.article_type}</span> : null}
        </div>

        {paper.doi ? (
          <p className="mt-4 text-sm text-zinc-700">
            DOI:{' '}
            <a className="underline" href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
              {paper.doi}
            </a>
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">DOI pending assignment</p>
        )}

        <section className="mt-6">
          <h2 className="font-semibold">Abstract</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{paper.abstract ?? 'No abstract provided.'}</p>
        </section>

        <div className="mt-7 flex flex-wrap gap-3">
          <a className="btn btn-primary" href={paper.file_url ?? '#'} target="_blank" rel="noreferrer">
            View full PDF
          </a>
          <a className="btn btn-secondary" href={`/api/public/submissions/${paper.id}/citation?format=bibtex`}>
            Download BibTeX
          </a>
          <Link className="btn btn-secondary" href="/">
            Back to discovery
          </Link>
        </div>
      </article>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
