'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
    async function loadSession() {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: null }));
      if (response.ok && body.data) {
        setUser(body.data as SessionUser);
        return;
      }

      const raw = localStorage.getItem('if_user');
      if (!raw) return;
      const parsed = JSON.parse(raw) as SessionUser;
      setUser(parsed);
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
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Incremental Findings</p>
          <Link href="/" className="mt-2 block font-serif text-5xl md:text-6xl">
            Incremental Findings
          </Link>
          <p className="mt-4 text-sm uppercase tracking-[0.15em] text-zinc-600">
            Independent research archive · Inspired by editorial publication aesthetics
          </p>
        </div>

        <nav className="btn-group text-sm">
          <Link className="btn btn-secondary" href="/">
            Main Page
          </Link>
          <Link className="btn btn-secondary" href="/submit">
            Submit Work
          </Link>
          <Link className="btn btn-secondary" href="/editor">
            Editorial Workspace
          </Link>
          <Link className="btn btn-secondary" href="/account">
            Account
          </Link>
          {user ? (
            <>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {user.name}
                {user.role === 'editor' ? ' · Editor' : ''}
              </span>
              <button type="button" onClick={logout} className="btn btn-ghost">
                Log out
              </button>
            </>
          ) : (
            <Link className="btn btn-primary" href="/login">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
