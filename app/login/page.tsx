import Link from 'next/link';
import { SiteHeader } from '@/components/header';

export default function LoginPage() {
  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Log in</h2>
      <p className="mt-2 text-sm text-zinc-600">Phase 1 uses a lightweight access flow. Full auth can be connected next.</p>

      <div className="mt-6 max-w-lg rounded border border-zinc-300 p-6">
        <label className="grid gap-1 text-sm">
          Email
          <input className="rounded border border-zinc-300 px-3 py-2" placeholder="you@research.org" />
        </label>

        <label className="mt-4 grid gap-1 text-sm">
          Password
          <input type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder="••••••••" />
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/account" className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800">
            Continue to account
          </Link>
          <Link href="/submit" className="rounded border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100">
            Quick submit
          </Link>
        </div>
      </div>
    </main>
  );
}
