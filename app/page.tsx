import Image from 'next/image';
import { SiteHeader } from '@/components/header';
import { PaperCard } from '@/components/paper-card';
import { listSubmissions } from '@/lib/submission-repository';

export const revalidate = 60;

export default async function HomePage() {
  const published = await listSubmissions('published');
  const latest = published[0];
  const rest = published.slice(1);

  return (
    <main>
      <SiteHeader />

      {latest ? (
        <section className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="relative min-h-72 overflow-hidden rounded-sm">
            <Image
              src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200"
              alt="research visual"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h2 className="font-serif text-3xl leading-tight">{latest.title}</h2>
            <p className="mt-3 text-sm text-zinc-600">
              <span className="font-semibold">Authors:</span> {latest.authors}
            </p>
            <blockquote className="mt-4 border-l-2 border-black pl-4 text-zinc-700">
              {(latest.abstract ?? 'No abstract provided.').slice(0, 260)}...
            </blockquote>
            <a
              href={latest.file_url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Read Full PDF
            </a>
          </div>
        </section>
      ) : (
        <p>No research published today.</p>
      )}

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {rest.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </section>
    </main>
  );
}
