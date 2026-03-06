import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { PaperCard } from '@/components/paper-card';
import { PandaRail } from '@/components/panda-rail';
import { SectionTitle } from '@/components/ui-kit';
import { listSubmissions } from '@/lib/submission-repository';
import { ARTICLE_TYPES, DISCIPLINES } from '@/lib/taxonomy';

export const revalidate = 60;

export default async function HomePage({
  searchParams
}: {
  searchParams?: { discipline?: string; article_type?: string };
}) {
  const published = await listSubmissions('published');

  const selectedDiscipline = searchParams?.discipline;
  const selectedArticleType = searchParams?.article_type;

  const filtered = published.filter((entry) => {
    const byDiscipline = selectedDiscipline ? entry.discipline === selectedDiscipline : true;
    const byArticleType = selectedArticleType ? entry.article_type === selectedArticleType : true;
    return byDiscipline && byArticleType;
  });

  const latest = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main>
      <PandaRail />
      <SiteHeader />

      <SectionTitle title="Discover incremental research" subtitle="Filter by discipline and type to explore concise, high-signal findings." />

      <section id="taxonomy" className="glass-panel mb-8 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <details className="group rounded border border-zinc-400 px-3 py-1">
            <summary className="cursor-pointer list-none text-sm font-semibold">
              Discipline{selectedDiscipline ? `: ${selectedDiscipline}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <Link
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                href={selectedArticleType ? `/?article_type=${encodeURIComponent(selectedArticleType)}` : '/'}
              >
                All disciplines
              </Link>
              {DISCIPLINES.map((discipline) => (
                <Link
                  key={discipline}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  href={`/?discipline=${encodeURIComponent(discipline)}${
                    selectedArticleType ? `&article_type=${encodeURIComponent(selectedArticleType)}` : ''
                  }`}
                >
                  {discipline}
                </Link>
              ))}
            </div>
          </details>

          <details className="group rounded border border-zinc-400 px-3 py-1">
            <summary className="cursor-pointer list-none text-sm font-semibold">
              Type{selectedArticleType ? `: ${selectedArticleType}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <Link
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                href={selectedDiscipline ? `/?discipline=${encodeURIComponent(selectedDiscipline)}` : '/'}
              >
                All types
              </Link>
              {ARTICLE_TYPES.map((articleType) => (
                <Link
                  key={articleType}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  href={`/?article_type=${encodeURIComponent(articleType)}${
                    selectedDiscipline ? `&discipline=${encodeURIComponent(selectedDiscipline)}` : ''
                  }`}
                >
                  {articleType}
                </Link>
              ))}
            </div>
          </details>

          {(selectedDiscipline || selectedArticleType) && (
            <Link className="btn btn-secondary" href="/">
              Clear filters
            </Link>
          )}
        </div>
      </section>

      {latest ? (
        <section className="glass-panel grid gap-6 p-4 md:grid-cols-[1.5fr_1fr] md:p-6">
          <div className="relative min-h-72 overflow-hidden rounded-sm">
            <Image
              src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200"
              alt="abstract research visual"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Latest published</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight">{latest.title}</h2>
            <p className="mt-3 text-sm text-zinc-600">
              <span className="font-semibold">Authors:</span> {latest.authors}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {latest.discipline ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{latest.discipline}</span> : null}
              {latest.topic ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{latest.topic}</span> : null}
              {latest.article_type ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{latest.article_type}</span> : null}
            </div>
            <blockquote className="mt-4 border-l-2 border-black pl-4 text-zinc-700">
              {(latest.abstract ?? 'No abstract provided.').slice(0, 260)}...
            </blockquote>
            <a
              href={latest.file_url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-4"
            >
              Read PDF
            </a>
          </div>
        </section>
      ) : (
        <section className="glass-panel p-8">
          <h2 className="font-serif text-3xl">No published submissions for this filter</h2>
          <p className="mt-3 max-w-2xl text-zinc-700">
            We only display real reviewed submissions. Try another discipline or format, or submit a new manuscript.
          </p>
        </section>
      )}

      {rest.length > 0 ? (
        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {rest.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
