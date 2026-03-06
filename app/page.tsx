import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { PaperCard } from '@/components/paper-card';
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
      <SiteHeader />

      <section id="taxonomy" className="mb-8 grid gap-6 rounded border border-zinc-300 p-5 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-serif text-2xl">Explore by discipline</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="rounded-full border border-zinc-400 px-3 py-1 text-sm hover:bg-zinc-100" href="/">
              All disciplines
            </Link>
            {DISCIPLINES.map((discipline) => (
              <Link
                key={discipline}
                className="rounded-full border border-zinc-400 px-3 py-1 text-sm hover:bg-zinc-100"
                href={`/?discipline=${encodeURIComponent(discipline)}${
                  selectedArticleType ? `&article_type=${encodeURIComponent(selectedArticleType)}` : ''
                }`}
              >
                {discipline}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-serif text-xl">Research format</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="rounded-full border border-zinc-400 px-3 py-1 text-xs uppercase tracking-wide hover:bg-zinc-100"
              href={selectedDiscipline ? `/?discipline=${encodeURIComponent(selectedDiscipline)}` : '/'}
            >
              All types
            </Link>
            {ARTICLE_TYPES.map((articleType) => (
              <Link
                key={articleType}
                className="rounded-full border border-zinc-400 px-3 py-1 text-xs uppercase tracking-wide hover:bg-zinc-100"
                href={`/?article_type=${encodeURIComponent(articleType)}${
                  selectedDiscipline ? `&discipline=${encodeURIComponent(selectedDiscipline)}` : ''
                }`}
              >
                {articleType}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {latest ? (
        <section className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
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
              className="mt-4 inline-flex rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Read PDF
            </a>
          </div>
        </section>
      ) : (
        <section className="rounded border border-zinc-300 p-8">
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
