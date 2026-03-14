import { SiteLang, getSiteLang } from '@/lib/site-copy';

export function withLang(path: string, lang?: string | null): any {
  const normalized = getSiteLang(lang);
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}lang=${normalized}`;
}

export function getClientLang(search: string): SiteLang {
  const params = new URLSearchParams(search);
  return getSiteLang(params.get('lang'));
}
