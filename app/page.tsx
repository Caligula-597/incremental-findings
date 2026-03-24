import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/header';
import { PaperCard } from '@/components/paper-card';
import { PandaRail } from '@/components/panda-rail';
import { MetricCard, SectionTitle } from '@/components/ui-kit';
import { listSubmissions } from '@/lib/submission-repository';
import { getArticleTypeOptions, getDisciplineOptions, getTaxonomyLabel } from '@/lib/taxonomy';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { getSubmissionTrack, getSubmissionTrackDoiNote, getSubmissionTrackLabel } from '@/lib/submission-track';
import { ACADEMIC_CAMPAIGN_MANIFESTO, ACADEMIC_CAMPAIGN_THEMES, CREATIVE_CAMPAIGN_MANIFESTO, CREATIVE_CAMPAIGN_THEMES } from '@/lib/creative-campaign';

export const revalidate = 60;

export default async function HomePage({
  searchParams
}: {
  searchParams?: { discipline?: string; article_type?: string; lang?: string; track?: string };
}) {
  const published = await listSubmissions('published');

  const lang = getSiteLang(searchParams?.lang);
  const copy = getSiteCopy(lang);

  const selectedTrack = searchParams?.track;
  const selectedDiscipline = searchParams?.discipline;
  const selectedArticleType = searchParams?.article_type;

  const sectionCopy = {
    track: lang === 'zh' ? '分区' : 'Track',
    discipline: lang === 'zh' ? '学科' : 'Discipline',
    type: lang === 'zh' ? '类型' : 'Type',
    authors: lang === 'zh' ? '作者' : 'Authors',
    noAbstract: lang === 'zh' ? '暂无摘要。' : 'No abstract provided.',
    publishedMetric: lang === 'zh' ? '已发布内容' : 'Published items',
    filteredMetric: lang === 'zh' ? '当前筛选可见' : 'Visible after filters',
    trackMetric: lang === 'zh' ? '活跃分区数' : 'Active tracks',
    topicMetric: lang === 'zh' ? '热门主题数' : 'Trending topics',
    trackTitle: lang === 'zh' ? '分区看板' : 'Track overview',
    trackSubtitle: lang === 'zh' ? '学术研讨区与自由创作区并行展示。' : 'Academic and creative tracks are displayed side by side.',
    academicTitle: lang === 'zh' ? '学术内容 / 可孵化正式版' : 'Academic track / incubating formal versions',
    academicSubtitle: lang === 'zh' ? '讨论稿可继续修订；满足条件后可申请 DOI。' : 'Discussion drafts can keep evolving; DOI is available only after a formal request and approval.',
    entertainmentTitle: lang === 'zh' ? '娱乐内容 / 自由创作展示' : 'Creative track / public display',
    entertainmentSubtitle: lang === 'zh' ? '合法合规公开展示，不分配 DOI。' : 'Publicly displayed for discussion, without DOI assignment.',
    emptyAcademic: lang === 'zh' ? '当前暂无学术区已发布内容。' : 'No published academic-track items yet.',
    emptyEntertainment: lang === 'zh' ? '当前暂无娱乐区已发布内容。' : 'No published creative-track items yet.',
    campaignTitle: lang === 'zh' ? '首期征稿活动（学术 + 自由创作）' : 'First Calls for Submissions (Academic + Creative)',
    campaignSubtitle: lang === 'zh' ? '两个分区都已开启主题征稿，可直接进入对应投稿入口。' : 'Both tracks are now accepting themed submissions with direct submission links.',
    academicCampaignTitle: lang === 'zh' ? '学术研究区征稿活动' : 'Academic Track Call',
    creativeCampaignTitle: lang === 'zh' ? '自由创作区征稿活动' : 'Creative Track Call'
  };

  const disciplineOptions = selectedTrack
    ? getDisciplineOptions(selectedTrack === 'entertainment' ? 'entertainment' : 'academic')
    : [...getDisciplineOptions('academic'), ...getDisciplineOptions('entertainment')].filter(
        (item, idx, arr) => arr.findIndex((candidate) => candidate.value === item.value) === idx
      );
  const articleTypeOptions = selectedTrack
    ? getArticleTypeOptions(selectedTrack === 'entertainment' ? 'entertainment' : 'academic')
    : [...getArticleTypeOptions('academic'), ...getArticleTypeOptions('entertainment')].filter(
        (item, idx, arr) => arr.findIndex((candidate) => candidate.value === item.value) === idx
      );

  const filtered = published.filter((entry) => {
    const byTrack = selectedTrack ? entry.category === selectedTrack : true;
    const byDiscipline = selectedDiscipline ? entry.discipline === selectedDiscipline : true;
    const byArticleType = selectedArticleType ? entry.article_type === selectedArticleType : true;
    return byTrack && byDiscipline && byArticleType;
  });

  const latest = filtered[0];
  const academic = filtered.filter((entry) => getSubmissionTrack(entry) === 'academic');
  const entertainment = filtered.filter((entry) => getSubmissionTrack(entry) === 'entertainment');

  const quickTopics = Array.from(new Set(filtered.map((item) => item.topic).filter(Boolean) as string[])).slice(0, 8);
  const trackBreakdown = [
    { key: 'academic', label: getSubmissionTrackLabel('academic', lang), count: published.filter((entry) => getSubmissionTrack(entry) === 'academic').length },
    { key: 'entertainment', label: getSubmissionTrackLabel('entertainment', lang), count: published.filter((entry) => getSubmissionTrack(entry) === 'entertainment').length }
  ].filter((item) => item.count > 0);

  const allDisciplines = Array.from(new Set(published.map((entry) => entry.discipline).filter(Boolean))) as string[];
  const disciplineBreakdown = allDisciplines.map((discipline) => ({
    label: getTaxonomyLabel(discipline, lang, 'discipline'),
    count: published.filter((entry) => entry.discipline === discipline).length
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const buildHref = (next: { track?: string | null; discipline?: string | null; article_type?: string | null }) => {
    const params = new URLSearchParams({ lang });
    const merged = {
      track: next.track === undefined ? selectedTrack : next.track,
      discipline: next.discipline === undefined ? selectedDiscipline : next.discipline,
      article_type: next.article_type === undefined ? selectedArticleType : next.article_type
    };
    if (merged.track) params.set('track', merged.track);
    if (merged.discipline) params.set('discipline', merged.discipline);
    if (merged.article_type) params.set('article_type', merged.article_type);
    return `/?${params.toString()}`;
  };

  return (
    <main>
      <PandaRail />
      <SiteHeader />

      <SectionTitle title={copy.home.title} subtitle={copy.home.subtitle} />

      <section id="taxonomy" className="glass-panel mb-8 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <details className="group rounded border border-zinc-400 px-3 py-1">
            <summary className="cursor-pointer list-none text-sm font-semibold">
              {sectionCopy.track}{selectedTrack ? `: ${getSubmissionTrackLabel(selectedTrack === 'entertainment' ? 'entertainment' : 'academic', lang)}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <a className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100" href={buildHref({ track: null })}>
                {copy.home.allTracks}
              </a>
              <a className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100" href={buildHref({ track: 'academic' })}>
                {getSubmissionTrackLabel('academic', lang)}
              </a>
              <a className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100" href={buildHref({ track: 'entertainment' })}>
                {getSubmissionTrackLabel('entertainment', lang)}
              </a>
            </div>
          </details>

          <details className="group rounded border border-zinc-400 px-3 py-1">
            <summary className="cursor-pointer list-none text-sm font-semibold">
              {sectionCopy.discipline}{selectedDiscipline ? `: ${getTaxonomyLabel(selectedDiscipline, lang, 'discipline')}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <a className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100" href={buildHref({ discipline: null })}>
                {copy.home.allDisciplines}
              </a>
              {disciplineOptions.map((discipline) => (
                <a
                  key={discipline.value}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  href={buildHref({ discipline: discipline.value })}
                >
                  {getTaxonomyLabel(discipline.value, lang, 'discipline')}
                </a>
              ))}
            </div>
          </details>

          <details className="group rounded border border-zinc-400 px-3 py-1">
            <summary className="cursor-pointer list-none text-sm font-semibold">
              {sectionCopy.type}{selectedArticleType ? `: ${getTaxonomyLabel(selectedArticleType, lang, 'article_type')}` : ''}
            </summary>
            <div className="mt-3 flex max-w-4xl flex-wrap gap-2 pb-2">
              <a className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100" href={buildHref({ article_type: null })}>
                {copy.home.allTypes}
              </a>
              {articleTypeOptions.map((articleType) => (
                <a key={articleType.value} className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100" href={buildHref({ article_type: articleType.value })}>
                  {articleType.label[lang]}
                </a>
              ))}
            </div>
          </details>

          {(selectedTrack || selectedDiscipline || selectedArticleType) && (
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
            <p className="mt-1 text-xs text-zinc-500">{getSubmissionTrackLabel(getSubmissionTrack(latest), lang)}</p>
            <p className="mt-1 text-xs text-zinc-500">{latest.doi ? `DOI: ${latest.doi}` : getSubmissionTrackDoiNote(getSubmissionTrack(latest), lang)}</p>
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

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        <MetricCard label={sectionCopy.publishedMetric} value={published.length} />
        <MetricCard label={sectionCopy.filteredMetric} value={filtered.length} />
        <MetricCard label={sectionCopy.trackMetric} value={trackBreakdown.length} />
        <MetricCard label={sectionCopy.topicMetric} value={quickTopics.length} />
      </section>

      <section className="mt-10 glass-panel p-6">
        <SectionTitle title={sectionCopy.campaignTitle} subtitle={sectionCopy.campaignSubtitle} className="mb-3" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <h4 className="text-sm font-semibold text-indigo-950">{sectionCopy.academicCampaignTitle}</h4>
            <p className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">{ACADEMIC_CAMPAIGN_MANIFESTO[lang]}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ACADEMIC_CAMPAIGN_THEMES.map((theme) => (
                <article key={theme.slug} className="rounded-lg border border-zinc-200 bg-white/90 p-4">
                  <h4 className="font-semibold">{theme.title[lang]}</h4>
                  <p className="mt-2 text-sm text-zinc-700">{theme.summary[lang]}</p>
                  <Link className="btn btn-secondary btn-sm mt-3" href={`/submit?lang=${lang}&track=academic&campaign_theme=${theme.slug}`}>
                    {theme.cta[lang]}
                  </Link>
                </article>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <h4 className="text-sm font-semibold text-purple-950">{sectionCopy.creativeCampaignTitle}</h4>
            <p className="mt-2 rounded-lg border border-purple-200 bg-purple-50/70 px-4 py-3 text-sm text-purple-900">{CREATIVE_CAMPAIGN_MANIFESTO[lang]}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {CREATIVE_CAMPAIGN_THEMES.map((theme) => (
                <article key={theme.slug} className="rounded-lg border border-zinc-200 bg-white/90 p-4">
                  <h4 className="font-semibold">{theme.title[lang]}</h4>
                  <p className="mt-2 text-sm text-zinc-700">{theme.summary[lang]}</p>
                  <Link className="btn btn-secondary btn-sm mt-3" href={`/submit?lang=${lang}&track=entertainment&campaign_theme=${theme.slug}`}>
                    {theme.cta[lang]}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="glass-panel p-5">
          <SectionTitle title={sectionCopy.trackTitle} subtitle={sectionCopy.trackSubtitle} className="mb-3" />
          <div className="space-y-2">
            {trackBreakdown.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm">
                <span>{item.label}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5">
          <SectionTitle title={lang === 'zh' ? '活跃学科' : 'Active disciplines'} subtitle={lang === 'zh' ? '根据全部已发布内容统计。' : 'Based on all published records.'} className="mb-3" />
          <div className="space-y-2">
            {disciplineBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-600">{lang === 'zh' ? '论文发布后，这里会显示学科分布。' : 'Discipline metrics will appear once papers are published.'}</p>
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

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <SectionTitle title={sectionCopy.academicTitle} subtitle={sectionCopy.academicSubtitle} className="mb-3" />
          <div className="grid gap-4">
            {academic.length === 0 ? <p className="text-sm text-zinc-600">{sectionCopy.emptyAcademic}</p> : academic.map((paper) => <PaperCard key={paper.id} paper={paper} lang={lang} />)}
          </div>
        </div>

        <div className="glass-panel p-5">
          <SectionTitle title={sectionCopy.entertainmentTitle} subtitle={sectionCopy.entertainmentSubtitle} className="mb-3" />
          <div className="grid gap-4">
            {entertainment.length === 0 ? <p className="text-sm text-zinc-600">{sectionCopy.emptyEntertainment}</p> : entertainment.map((paper) => <PaperCard key={paper.id} paper={paper} lang={lang} />)}
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
