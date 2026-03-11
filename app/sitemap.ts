import type { MetadataRoute } from 'next';
import { listSubmissions } from '@/lib/submission-repository';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const published = await listSubmissions('published');

  const staticRoutes: MetadataRoute.Sitemap = ['', '/submit', '/login', '/community'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7
  }));

  const paperRoutes: MetadataRoute.Sitemap = published.map((paper) => ({
    url: `${base}/papers/${paper.id}`,
    lastModified: paper.created_at,
    changeFrequency: 'monthly',
    priority: 0.8
  }));

  return [...staticRoutes, ...paperRoutes];
}
