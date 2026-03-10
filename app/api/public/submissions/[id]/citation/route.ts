import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionById } from '@/lib/submission-repository';
import { isResolvableDoi } from '@/lib/doi';

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

    return NextResponse.json({ error: 'Unsupported format. Use bibtex|ris|csl-json' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
