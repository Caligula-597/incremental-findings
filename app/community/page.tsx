import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { JOURNAL_POSITIONING, JOURNAL_PUBLIC_PROGRAMS } from '@/lib/journal-plan';
import { INTEGRATION_PROVIDERS } from '@/lib/integration-plan';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';

export default function CommunityPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);

  const sectionCopy = {
    programsTitle: lang === 'zh' ? '公众项目' : 'Public-facing programs',
    programsSubtitle: lang === 'zh' ? '让期刊内容不只服务同行评审，也服务公众理解。' : 'Make journal content useful not only for peer review, but also for public understanding.',
    missionDetailsTitle: lang === 'zh' ? '期刊使命（扩展）' : 'Extended mission',
    missionDetailsSubtitle: lang === 'zh' ? '我们强调“增量但可靠”的学术价值观。' : 'Our editorial philosophy emphasizes “incremental yet reliable” science.',
    pillarsTitle: lang === 'zh' ? '办刊原则' : 'Editorial pillars',
    roadmapTitle: lang === 'zh' ? '外部 API 与基础设施路线图' : 'External API & infrastructure roadmap',
    roadmapSubtitle:
      lang === 'zh'
        ? '真实期刊需要外部生态协作：身份、DOI、发现性、计量与长期保存。'
        : 'A real journal needs ecosystem integration: identity, DOI, discoverability, metrics, and preservation.',
    provider: lang === 'zh' ? '服务方' : 'Provider',
    category: lang === 'zh' ? '类别' : 'Category',
    priority: lang === 'zh' ? '优先级' : 'Priority',
    purpose: lang === 'zh' ? '用途' : 'Purpose',
    machineReadableLabel: lang === 'zh' ? '机器可读清单接口：' : 'Machine-readable endpoint:',
    contributeTitle: lang === 'zh' ? '参与贡献' : 'Contribute',
    contributeSubtitle: lang === 'zh' ? '欢迎投稿、复现实验、方法改进与公共证据摘要。' : 'Submissions, replications, method improvements and public evidence notes are all welcome.',
    submitButton: lang === 'zh' ? '投稿' : 'Submit to journal',
    joinButton: lang === 'zh' ? '作为作者/编辑加入' : 'Join as author/editor'
  };

  return (
    <main>
      <SiteHeader />
      <SectionTitle title={copy.community.title} subtitle={copy.community.subtitle} />

      <section className="glass-panel p-6">
        <h3 className="font-serif text-3xl">{JOURNAL_POSITIONING.name}</h3>
        <p className="mt-3 max-w-3xl text-sm text-zinc-700">{JOURNAL_POSITIONING.mission[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {JOURNAL_POSITIONING.audience[lang].map((item) => (
            <span key={item} className="rounded-full border border-zinc-300 bg-white/90 px-3 py-1">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <SectionTitle title={sectionCopy.missionDetailsTitle} subtitle={sectionCopy.missionDetailsSubtitle} className="mb-2" />
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
          {JOURNAL_POSITIONING.missionExtended[lang].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide text-zinc-600">{sectionCopy.pillarsTitle}</h4>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {JOURNAL_POSITIONING.pillars[lang].map((item) => (
            <span key={item} className="rounded-full border border-zinc-300 bg-white/90 px-3 py-1">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle title={sectionCopy.programsTitle} subtitle={sectionCopy.programsSubtitle} />
        <div className="grid gap-4 md:grid-cols-3">
          {JOURNAL_PUBLIC_PROGRAMS[lang].map((program) => (
            <article key={program.title} className="glass-panel p-5">
              <h4 className="font-semibold">{program.title}</h4>
              <p className="mt-2 text-sm text-zinc-700">{program.description}</p>
            </article>
          ))}
        </div>
      </section>


      <section className="mt-8 glass-panel p-6">
        <SectionTitle title={sectionCopy.roadmapTitle} subtitle={sectionCopy.roadmapSubtitle} className="mb-4" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">{sectionCopy.provider}</th>
                <th className="px-3 py-2">{sectionCopy.category}</th>
                <th className="px-3 py-2">{sectionCopy.priority}</th>
                <th className="px-3 py-2">{sectionCopy.purpose}</th>
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
          {sectionCopy.machineReadableLabel} <code className="rounded bg-zinc-100 px-1 py-0.5">/api/public/integrations/requirements</code>
        </p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <SectionTitle title={sectionCopy.contributeTitle} subtitle={sectionCopy.contributeSubtitle} className="mb-3" />
        <div className="btn-group">
          <Link className="btn btn-primary" href={`/submit?lang=${lang}`}>
            {sectionCopy.submitButton}
          </Link>
          <Link className="btn btn-secondary" href={`/login?lang=${lang}`}>
            {sectionCopy.joinButton}
          </Link>
        </div>
      </section>
    </main>
  );
}
