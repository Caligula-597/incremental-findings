'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ZH_COPY } from '@/lib/site-copy';
import { useRouter } from 'next/navigation';

interface SessionUser {
  email: string;
  name: string;
  role?: 'author' | 'editor';
}

export function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
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
    router.push('/login');
  }

  return (
    <header className="mb-10 border-b border-zinc-200 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{ZH_COPY.siteName}</p>
          <Link href="/" className="mt-2 block font-serif text-5xl md:text-6xl">
            {ZH_COPY.siteName}
          </Link>
          <p className="mt-4 text-sm uppercase tracking-[0.15em] text-zinc-600">
            {ZH_COPY.tagline}
          </p>
        </div>

        <nav className="btn-group text-sm">
          <Link className="btn btn-secondary" href="/">
            {ZH_COPY.nav.home}
          </Link>
          <Link className="btn btn-secondary" href="/submit">
            {ZH_COPY.nav.submit}
          </Link>
          <Link className="btn btn-secondary" href="/community">
            {ZH_COPY.nav.community}
          </Link>
          <Link className="btn btn-secondary" href="/editor">
            {ZH_COPY.nav.editor}
          </Link>
          <Link className="btn btn-secondary" href="/account">
            {ZH_COPY.nav.account}
          </Link>
          {user ? (
            <>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {user.name}
                {user.role === 'editor' ? ' · Editor' : ''}
              </span>
              <button type="button" onClick={logout} className="btn btn-ghost">
                {ZH_COPY.nav.logout}
              </button>
            </>
          ) : (
            <Link className="btn btn-primary" href="/login">
              {ZH_COPY.nav.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
