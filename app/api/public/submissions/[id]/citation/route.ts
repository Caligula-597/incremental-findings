import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionById } from '@/lib/submission-repository';

function toBibTeXKey(title: string, createdAt: string) {
  const y = new Date(createdAt).getUTCFullYear();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
  return `${slug || 'finding'}${y}`;
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const format = request.nextUrl.searchParams.get('format') ?? 'bibtex';
    const paper = await getSubmissionById(context.params.id);

    if (!paper || paper.status !== 'published') {
      return NextResponse.json({ error: 'Published paper not found' }, { status: 404 });
    }

    if (format !== 'bibtex') {
      return NextResponse.json({ error: 'Unsupported format. Use format=bibtex' }, { status: 400 });
    }

    const key = toBibTeXKey(paper.title, paper.created_at);
    const year = new Date(paper.created_at).getUTCFullYear();
    const doiLine = paper.doi ? `  doi = {${paper.doi}},\n` : '';
    const urlLine = paper.file_url ? `  url = {${paper.file_url}},\n` : '';

    const bib = `@article{${key},\n  title = {${paper.title}},\n  author = {${paper.authors}},\n  journal = {Incremental Findings},\n  year = {${year}},\n${doiLine}${urlLine}}\n`;

    return new NextResponse(bib, {
      headers: {
        'Content-Type': 'application/x-bibtex; charset=utf-8',
        'Content-Disposition': `attachment; filename="${context.params.id}.bib"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
