import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { PaperCard } from '@/components/paper-card';
import { PandaRail } from '@/components/panda-rail';
import { MetricCard, SectionTitle } from '@/components/ui-kit';
import { listSubmissions } from '@/lib/submission-repository';
import { ARTICLE_TYPES, DISCIPLINES } from '@/lib/taxonomy';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';

export const revalidate = 60;

export default async function HomePage({
  searchParams
}: {
  searchParams?: { discipline?: string; article_type?: string; lang?: string };
}) {
  const published = await listSubmissions('published');

  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);

  const selectedDiscipline = searchParams?.discipline;
  const selectedArticleType = searchParams?.article_type;

  const sectionCopy = {
    discipline: lang === 'zh' ? '学科' : 'Discipline',
    type: lang === 'zh' ? '类型' : 'Type',
    authors: lang === 'zh' ? '作者' : 'Authors',
    noAbstract: lang === 'zh' ? '暂无摘要。' : 'No abstract provided.',
    publishedMetric: lang === 'zh' ? '已发布论文' : 'Published papers',
    filteredMetric: lang === 'zh' ? '当前筛选可见' : 'Visible after filters',
    disciplineMetric: lang === 'zh' ? '活跃学科数' : 'Disciplines active',
    topicMetric: lang === 'zh' ? '热门主题数' : 'Trending topics',
    trendingTitle: lang === 'zh' ? '热门主题' : 'Trending topics',
    trendingSubtitle: lang === 'zh' ? '基于当前已发布论文的实时主题快照。' : 'Live snapshot based on currently published records.',
    trendingEmpty: lang === 'zh' ? '首批论文发布后，这里会显示主题聚合。' : 'Topics will appear after the first publications are indexed.',
    disciplineTitle: lang === 'zh' ? '活跃学科' : 'Active disciplines',
    disciplineSubtitle: lang === 'zh' ? '根据已发布内容观察当前稿件分布。' : 'Where incoming submissions are concentrated.',
    disciplineEmpty: lang === 'zh' ? '论文发布后，这里会显示学科分布。' : 'Discipline metrics will appear once papers are published.'
  };

  const filtered = published.filter((entry) => {
    const byDiscipline = selectedDiscipline ? entry.discipline === selectedDiscipline : true;
    const byArticleType = selectedArticleType ? entry.article_type === selectedArticleType : true;
    return byDiscipline && byArticleType;
  });

  const latest = filtered[0];
  const rest = filtered.slice(1);

  const disciplineBreakdown = DISCIPLINES.map((discipline) => ({
    label: discipline,
    count: published.filter((entry) => entry.discipline === discipline).length
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const quickTopics = Array.from(new Set(published.map((item) => item.topic).filter(Boolean) as string[])).slice(0, 8);

  return (
    <main>
      <PandaRail />
      <SiteHeader />

      <SectionTitle title={copy.home.title} subtitle={copy.home.subtitle} />

      <section id="taxonomy" className="glass-panel mb-8 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <details className="group rounded border border-zinc-400 px-3 py-1">
            <summary className="cursor-pointer list-none text-sm font-semibold">
              {sectionCopy.discipline}{selectedDiscipline ? `: ${selectedDiscipline}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <Link
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                href={selectedArticleType ? `/?lang=${lang}&article_type=${encodeURIComponent(selectedArticleType)}` : `/?lang=${lang}`}
              >
                {copy.home.allDisciplines}
              </Link>
              {DISCIPLINES.map((discipline) => (
                <Link
                  key={discipline}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  href={`/?lang=${lang}&discipline=${encodeURIComponent(discipline)}${
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
              {sectionCopy.type}{selectedArticleType ? `: ${selectedArticleType}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <Link
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                href={selectedDiscipline ? `/?lang=${lang}&discipline=${encodeURIComponent(selectedDiscipline)}` : `/?lang=${lang}`}
              >
                {copy.home.allTypes}
              </Link>
              {ARTICLE_TYPES.map((articleType) => (
                <Link
                  key={articleType}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  href={`/?lang=${lang}&article_type=${encodeURIComponent(articleType)}${
                    selectedDiscipline ? `&discipline=${encodeURIComponent(selectedDiscipline)}` : ''
                  }`}
                >
                  {articleType}
                </Link>
              ))}
            </div>
          </details>

          {(selectedDiscipline || selectedArticleType) && (
            <Link className="btn btn-secondary" href={`/?lang=${lang}`}>
              {copy.home.clearFilters}
            </Link>
          )}
        </div>
      </section>

      {latest ? (
        <section className="glass-panel grid gap-6 p-4 md:grid-cols-[1.5fr_1fr] md:p-6">
          <div className="relative min-h-72 overflow-hidden rounded-sm">
            <Image
              src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200"
              alt={lang === 'zh' ? '抽象研究视觉图' : 'abstract research visual'}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{copy.home.latestPublished}</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight">{latest.title}</h2>
            <p className="mt-3 text-sm text-zinc-600">
              <span className="font-semibold">{sectionCopy.authors}:</span> {latest.authors}
            </p>
            {latest.doi ? <p className="mt-1 text-xs text-zinc-500">DOI: {latest.doi}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {latest.discipline ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{latest.discipline}</span> : null}
              {latest.topic ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{latest.topic}</span> : null}
              {latest.article_type ? <span className="rounded-full border border-zinc-300 px-2 py-0.5">{latest.article_type}</span> : null}
            </div>
            <blockquote className="mt-4 border-l-2 border-black pl-4 text-zinc-700">
              {(latest.abstract ?? sectionCopy.noAbstract).slice(0, 260)}...
            </blockquote>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn btn-primary" href={`/papers/${latest.id}?lang=${lang}`}>
                {copy.home.openArticle}
              </Link>
              <a href={latest.file_url ?? '#'} target="_blank" rel="noreferrer" className="btn btn-secondary">
                {copy.home.readPdf}
              </a>
            </div>
          </div>
        </section>
      ) : (
        <section className="glass-panel p-8">
          <h2 className="font-serif text-3xl">{copy.home.noPublishedTitle}</h2>
          <p className="mt-3 max-w-2xl text-zinc-700">{copy.home.noPublishedDesc}</p>
        </section>
      )}

      {rest.length > 0 ? (
        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {rest.map((paper) => (
            <PaperCard key={paper.id} paper={paper} lang={lang} />
          ))}
        </section>
      ) : null}

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        <MetricCard label={sectionCopy.publishedMetric} value={published.length} />
        <MetricCard label={sectionCopy.filteredMetric} value={filtered.length} />
        <MetricCard label={sectionCopy.disciplineMetric} value={disciplineBreakdown.length} />
        <MetricCard label={sectionCopy.topicMetric} value={quickTopics.length} />
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="glass-panel p-5">
          <SectionTitle title={sectionCopy.trendingTitle} subtitle={sectionCopy.trendingSubtitle} className="mb-3" />
          <div className="flex flex-wrap gap-2">
            {quickTopics.length === 0 ? (
              <p className="text-sm text-zinc-600">{sectionCopy.trendingEmpty}</p>
            ) : (
              quickTopics.map((topic) => (
                <span key={topic} className="rounded-full border border-zinc-300 bg-white/80 px-3 py-1 text-sm text-zinc-700">
                  {topic}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-5">
          <SectionTitle title={sectionCopy.disciplineTitle} subtitle={sectionCopy.disciplineSubtitle} className="mb-3" />
          <div className="space-y-2">
            {disciplineBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-600">{sectionCopy.disciplineEmpty}</p>
            ) : (
              disciplineBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 glass-panel p-6">
        <SectionTitle title={copy.home.contributeTitle} subtitle={copy.home.contributeSubtitle} className="mb-3" />
        <div className="btn-group">
          <Link className="btn btn-primary" href={`/submit?lang=${lang}`}>
            {copy.home.startSubmission}
          </Link>
          <Link className="btn btn-secondary" href={`/account?lang=${lang}`}>
            {copy.home.manageAccount}
          </Link>
          <Link className="btn btn-secondary" href={`/editor?lang=${lang}`}>
            {copy.home.openEditor}
          </Link>
        </div>
      </section>
    </main>
  );
}
