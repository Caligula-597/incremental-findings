import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionById } from '@/lib/submission-repository';
import { isResolvableDoi } from '@/lib/doi';


function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toJatsXml(paper: { id: string; title: string; authors: string; created_at: string; abstract?: string | null; doi?: string | null }) {
  const year = new Date(paper.created_at).getUTCFullYear();
  const contributors = paper.authors
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((name) => `<contrib contrib-type="author"><name><string-name>${escapeXml(name)}</string-name></name></contrib>`)
    .join('');

  const articleId = isResolvableDoi(paper.doi)
    ? `<article-id pub-id-type="doi">${escapeXml(paper.doi ?? '')}</article-id>`
    : `<article-id pub-id-type="publisher-id">${escapeXml(paper.id)}</article-id>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<article article-type="research-article">
  <front>
    <article-meta>
      ${articleId}
      <title-group><article-title>${escapeXml(paper.title)}</article-title></title-group>
      <contrib-group>${contributors}</contrib-group>
      <pub-date><year>${year}</year></pub-date>
      ${paper.abstract ? `<abstract><p>${escapeXml(paper.abstract)}</p></abstract>` : ''}
    </article-meta>
  </front>
</article>`;
}

function toCitationKey(title: string, createdAt: string) {
  const y = new Date(createdAt).getUTCFullYear();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
  return `${slug || 'finding'}${y}`;
}

function toBibTeX(paper: { title: string; authors: string; created_at: string; doi?: string | null; file_url?: string | null }) {
  const key = toCitationKey(paper.title, paper.created_at);
  const year = new Date(paper.created_at).getUTCFullYear();
  const doiLine = isResolvableDoi(paper.doi) ? `  doi = {${paper.doi}},\n` : '';
  const urlLine = paper.file_url ? `  url = {${paper.file_url}},\n` : '';
  return `@article{${key},\n  title = {${paper.title}},\n  author = {${paper.authors}},\n  journal = {Incremental Findings},\n  year = {${year}},\n${doiLine}${urlLine}}\n`;
}

function toRIS(paper: { title: string; authors: string; created_at: string; doi?: string | null; file_url?: string | null }) {
  const year = new Date(paper.created_at).getUTCFullYear();
  const authors = paper.authors
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => `AU  - ${name}`)
    .join('\n');

  const doiLine = isResolvableDoi(paper.doi) ? `\nDO  - ${paper.doi}` : '';
  const urlLine = paper.file_url ? `\nUR  - ${paper.file_url}` : '';

  return `TY  - JOUR\nTI  - ${paper.title}\nJO  - Incremental Findings\n${authors}\nPY  - ${year}${doiLine}${urlLine}\nER  - `;
}

function toCslJson(paper: { id: string; title: string; authors: string; created_at: string; doi?: string | null; file_url?: string | null }) {
  const year = new Date(paper.created_at).getUTCFullYear();
  const author = paper.authors
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => {
      const parts = name.split(/\s+/);
      const family = parts.pop() || name;
      const given = parts.join(' ');
      return { family, given };
    });

  return {
    id: paper.id,
    type: 'article-journal',
    title: paper.title,
    issued: { 'date-parts': [[year]] },
    'container-title': 'Incremental Findings',
    author,
    DOI: isResolvableDoi(paper.doi) ? paper.doi ?? undefined : undefined,
    URL: paper.file_url ?? undefined
  };
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const format = (request.nextUrl.searchParams.get('format') ?? 'bibtex').toLowerCase();
    const paper = await getSubmissionById(context.params.id);

    if (!paper || paper.status !== 'published') {
      return NextResponse.json({ error: 'Published paper not found' }, { status: 404 });
    }

    if (format === 'bibtex') {
      const bib = toBibTeX(paper);
      return new NextResponse(bib, {
        headers: {
          'Content-Type': 'application/x-bibtex; charset=utf-8',
          'Content-Disposition': `attachment; filename="${context.params.id}.bib"`
        }
      });
    }

    if (format === 'ris') {
      const ris = toRIS(paper);
      return new NextResponse(ris, {
        headers: {
          'Content-Type': 'application/x-research-info-systems; charset=utf-8',
          'Content-Disposition': `attachment; filename="${context.params.id}.ris"`
        }
      });
    }

    if (format === 'csl-json') {
      return NextResponse.json({ data: toCslJson(paper) });
    }

    if (format === 'jats') {
      const xml = toJatsXml(paper);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${context.params.id}.xml"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Use bibtex|ris|csl-json|jats' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
