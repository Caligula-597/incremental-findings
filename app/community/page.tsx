import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { JOURNAL_POSITIONING, JOURNAL_PUBLIC_PROGRAMS } from '@/lib/journal-plan';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { CREATIVE_CAMPAIGN_MANIFESTO, CREATIVE_CAMPAIGN_THEMES } from '@/lib/creative-campaign';

export default function CommunityPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);

  const sectionCopy = {
    programsTitle: lang === 'zh' ? '公众项目' : 'Public-facing programs',
    programsSubtitle: lang === 'zh' ? '让期刊内容不只服务同行评审，也服务公众理解。' : 'Make journal content useful not only for peer review, but also for public understanding.',
    campaignTitle: lang === 'zh' ? '自由创作区征稿活动（双主题同步）' : 'Creative Track Call for Submissions (Dual Themes)',
    campaignSubtitle: lang === 'zh' ? '我们同步开启两个主题征稿，欢迎研究者、工程师与公众写作者共同参与。' : 'Two themes are now open in parallel for researchers, engineers, and public-facing writers.',
    missionDetailsTitle: lang === 'zh' ? '期刊使命（扩展）' : 'Extended mission',
    missionDetailsSubtitle: lang === 'zh' ? '我们强调“增量但可靠”的学术价值观。' : 'Our editorial philosophy emphasizes “incremental yet reliable” science.',
    pillarsTitle: lang === 'zh' ? '办刊原则' : 'Editorial pillars',
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
        <SectionTitle title={sectionCopy.campaignTitle} subtitle={sectionCopy.campaignSubtitle} />
        <p className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">{CREATIVE_CAMPAIGN_MANIFESTO[lang]}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CREATIVE_CAMPAIGN_THEMES.map((theme) => (
            <article key={theme.slug} className="rounded-xl border border-zinc-200 bg-white/90 p-4">
              <h4 className="font-semibold">{theme.title[lang]}</h4>
              <p className="mt-2 text-sm text-zinc-700">{theme.summary[lang]}</p>
              <Link className="btn btn-secondary btn-sm mt-3" href={`/submit?lang=${lang}&track=entertainment&campaign_theme=${theme.slug}`}>
                {theme.cta[lang]}
              </Link>
            </article>
          ))}
        </div>
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
