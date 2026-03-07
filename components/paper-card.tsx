import Link from 'next/link';
import { Submission } from '@/lib/types';

export function PaperCard({ paper }: { paper: Submission }) {
  return (
    <article className="paper-card">
      <h3 className="font-serif text-xl leading-snug">{paper.title}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">{paper.created_at.slice(0, 10)}</p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {paper.discipline ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.discipline}</span> : null}
        {paper.topic ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.topic}</span> : null}
        {paper.article_type ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{paper.article_type}</span> : null}
      </div>

      <p className="mt-2 text-sm text-zinc-600">{paper.authors}</p>
      {paper.doi ? <p className="mt-1 text-xs text-zinc-500">DOI: {paper.doi}</p> : null}
      <p className="mt-3 text-sm text-zinc-700">{(paper.abstract ?? 'No abstract provided.').slice(0, 160)}...</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="btn btn-secondary btn-sm" href={`/papers/${paper.id}`}>
          Open article
        </Link>
        <a
          className="btn btn-ghost btn-sm"
          href={paper.file_url ?? '#'}
          target="_blank"
          rel="noreferrer"
        >
          PDF
        </a>
      </div>
    </article>
  );
}
