import Link from 'next/link';

export function SiteHeader() {
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
          <Link className="rounded border border-zinc-400 px-3 py-1 hover:bg-zinc-100" href="/login">
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}
