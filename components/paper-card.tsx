import { Submission } from '@/lib/types';

export function PaperCard({ paper }: { paper: Submission }) {
  return (
    <article className="paper-card">
      <h3 className="font-serif text-xl leading-snug">{paper.title}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
        {paper.category} · {paper.createdAt.slice(0, 10)}
      </p>
      <p className="mt-3 text-sm text-zinc-700">{paper.review.slice(0, 160)}...</p>
      <a
        className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
        href={paper.fileUrl}
        target="_blank"
        rel="noreferrer"
      >
        View Paper
      </a>
    </article>
  );
}
