'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionUser {
  email: string;
  name: string;
}

export function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('if_user');
    if (!raw) return;
    const parsed = JSON.parse(raw) as SessionUser;
    setUser(parsed);
  }, []);

  function logout() {
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

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/">
            Main Page
          </Link>
          <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/submit">
            Submit Work
          </Link>
          <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/editor">
            Editorial Workspace
          </Link>
          <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/account">
            Account
          </Link>
          {user ? (
            <>
              <span className="px-1 text-zinc-600">{user.name}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded border border-zinc-400 px-3 py-1 hover:bg-zinc-100"
              >
                Log out
              </button>
            </>
          ) : (
            <Link className="rounded border border-zinc-400 px-3 py-1 hover:bg-zinc-100" href="/login">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
