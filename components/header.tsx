'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSiteCopy, SiteLang } from '@/lib/site-copy';

interface SessionUser {
  email: string;
  name: string;
  role?: 'author' | 'editor';
}

export function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [lang, setLang] = useState<SiteLang>('zh');

  const copy = getSiteCopy(lang);

  function withLang(path: string): any {
    return `${path}?lang=${lang}`;
  }

  function switchLang(next: SiteLang) {
    setLang(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', next);
      window.location.replace(url.toString());
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nextLang = window.location.search.includes('lang=en') ? 'en' : 'zh';
      setLang(nextLang);
    }

    const raw = localStorage.getItem('if_user');
    if (raw) {
      try {
        setUser(JSON.parse(raw) as SessionUser);
      } catch {
        localStorage.removeItem('if_user');
      }
    }

    async function loadSession() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal });
        const body = await response.json().catch(() => ({ data: null }));
        if (response.ok && body.data) {
          setUser(body.data as SessionUser);
        }
      } catch {
        // ignore transient timeout/network issues to keep header responsive
      } finally {
        clearTimeout(timeout);
      }
    }

    void loadSession();
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('if_user');
    setUser(null);
    router.push(withLang('/login') as any);
  }

  return (
    <header className="mb-10 border-b border-zinc-200 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{copy.siteName}</p>
          <Link href={withLang('/')} className="mt-2 block font-serif text-5xl md:text-6xl">
            {copy.siteName}
          </Link>
          <p className="mt-4 text-sm uppercase tracking-[0.15em] text-zinc-600">{copy.tagline}</p>
        </div>

        <nav className="btn-group text-sm">
          <button type="button" className="btn btn-ghost" onClick={() => switchLang(lang === 'zh' ? 'en' : 'zh')}>
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <Link className="btn btn-secondary" href={withLang('/')}>
            {copy.nav.home}
          </Link>
          <Link className="btn btn-secondary" href={withLang('/submit')}>
            {copy.nav.submit}
          </Link>
          <Link className="btn btn-secondary" href={withLang('/community')}>
            {copy.nav.community}
          </Link>
          <Link className="btn btn-secondary" href={withLang('/write')}>
            {lang === 'zh' ? '写作台' : 'Writing'}
          </Link>
          <Link className="btn btn-secondary" href={withLang('/editor')}>
            {copy.nav.editor}
          </Link>
          <Link className="btn btn-secondary" href={withLang('/account')}>
            {copy.nav.account}
          </Link>
          {user ? (
            <>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {user.name}
                {user.role === 'editor' ? ' · Editor' : ''}
              </span>
              <button type="button" onClick={logout} className="btn btn-ghost">
                {copy.nav.logout}
              </button>
            </>
          ) : (
            <Link className="btn btn-primary" href={withLang('/login')}>
              {copy.nav.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
