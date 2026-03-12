import { NextRequest, NextResponse } from 'next/server';
import { listSubmissions } from '@/lib/submission-repository';

export async function GET(request: NextRequest) {
  try {
    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = Math.max(1, Math.min(Number(limitRaw ?? '50'), 200));

    const published = await listSubmissions('published');
    const data = published.slice(0, limit).map((item) => ({
      id: item.id,
      title: item.title,
      authors: item.authors,
      abstract: item.abstract,
      discipline: item.discipline,
      topic: item.topic,
      article_type: item.article_type,
      created_at: item.created_at,
      doi: item.doi,
      article_url: `/papers/${item.id}`,
      file_url: item.file_url
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
