import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { JOURNAL_2026_TARGETS, JOURNAL_POSITIONING, JOURNAL_PUBLIC_PROGRAMS } from '@/lib/journal-plan';
import { INTEGRATION_PROVIDERS } from '@/lib/integration-plan';
import { COMPLETED_FOUNDATION_ITEMS, FEATURE_ROADMAP, getRoadmapSummary } from '@/lib/feature-roadmap';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';

export default function CommunityPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);
  return (
    <main>
      <SiteHeader />
      <SectionTitle
        title={copy.community.title}
        subtitle={copy.community.subtitle}
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
        <SectionTitle
          title="External API & infrastructure roadmap"
          subtitle="真实期刊需要外部生态协作：身份、DOI、发现性、计量与长期保存。"
          className="mb-4"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATION_PROVIDERS.map((item) => (
                <tr key={item.id} className="border-t border-zinc-200/70">
                  <td className="px-3 py-3 font-medium">{item.name}</td>
                  <td className="px-3 py-3 capitalize text-zinc-600">{item.category}</td>
                  <td className="px-3 py-3 uppercase text-xs tracking-wide text-zinc-500">{item.priority}</td>
                  <td className="px-3 py-3 text-zinc-700">{item.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          机器可读清单接口：<code className="rounded bg-zinc-100 px-1 py-0.5">/api/public/integrations/requirements</code>
        </p>
      </section>


      <section className="mt-8 glass-panel p-6">
        <SectionTitle
          title="What is still missing (platform readiness)"
          subtitle="我们先把完整设计补齐：这些模块到位后，才接近真实大期刊系统。"
          className="mb-4"
        />
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {Object.entries(getRoadmapSummary()).map(([key, value]) => (
            <span key={key} className="rounded-full border border-zinc-300 bg-white/90 px-3 py-1">
              {key}: {value}
            </span>
          ))}
        </div>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-emerald-700">
          {COMPLETED_FOUNDATION_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="space-y-3">
          {FEATURE_ROADMAP.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">{item.module}</h4>
                <span className="text-xs uppercase tracking-wide text-zinc-500">{item.priority} · {item.currentState}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-700">{item.goal}</p>
              <p className="mt-2 text-xs text-zinc-600">下个里程碑：{item.nextMilestone}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          机器可读清单接口：<code className="rounded bg-zinc-100 px-1 py-0.5">/api/public/platform-readiness</code>
        </p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <SectionTitle title="Contribute" subtitle="欢迎投稿、复现实验、方法改进与公共证据摘要。" className="mb-3" />
        <div className="btn-group">
          <Link className="btn btn-primary" href={`/submit?lang=${lang}`}>
            Submit to journal
          </Link>
          <Link className="btn btn-secondary" href={`/login?lang=${lang}`}>
            Join as author/editor
          </Link>
        </div>
      </section>
    </main>
  );
}
