import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { JOURNAL_2026_TARGETS, JOURNAL_POSITIONING, JOURNAL_PUBLIC_PROGRAMS } from '@/lib/journal-plan';

export default function CommunityPage() {
  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title="Journal Mission & Public Plan"
        subtitle="面向群众、面向研究者、面向可复现证据：这是我们期刊的公开目标。"
      />

      <section className="glass-panel p-6">
        <h3 className="font-serif text-3xl">{JOURNAL_POSITIONING.name}</h3>
        <p className="mt-3 max-w-3xl text-sm text-zinc-700">{JOURNAL_POSITIONING.mission}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {JOURNAL_POSITIONING.audience.map((item) => (
            <span key={item} className="rounded-full border border-zinc-300 bg-white/90 px-3 py-1">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle title="Public-facing programs" subtitle="让期刊内容不只服务同行评审，也服务公众理解。" />
        <div className="grid gap-4 md:grid-cols-3">
          {JOURNAL_PUBLIC_PROGRAMS.map((program) => (
            <article key={program.title} className="glass-panel p-5">
              <h4 className="font-semibold">{program.title}</h4>
              <p className="mt-2 text-sm text-zinc-700">{program.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <SectionTitle title="2026 target plan" subtitle="公开目标可度量，便于外界监督。" className="mb-2" />
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
          {JOURNAL_2026_TARGETS.map((target) => (
            <li key={target}>{target}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 glass-panel p-6">
        <SectionTitle title="Contribute" subtitle="欢迎投稿、复现实验、方法改进与公共证据摘要。" className="mb-3" />
        <div className="btn-group">
          <Link className="btn btn-primary" href="/submit">
            Submit to journal
          </Link>
          <Link className="btn btn-secondary" href="/login">
            Join as author/editor
          </Link>
        </div>
      </section>
    </main>
  );
}
