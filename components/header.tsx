import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="mb-10">
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Incremental Findings</p>
      <h1 className="nature-heading mt-3">Incremental Findings</h1>
      <p className="mt-4 text-sm uppercase tracking-[0.15em] text-zinc-600">
        Independent research archive · Inspired by editorial publication aesthetics
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/">
          Home
        </Link>
        <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/submit">
          Submit
        </Link>
        <Link className="rounded border border-black px-3 py-1 hover:bg-black hover:text-white" href="/editor">
          Editor
        </Link>
      </nav>
    </header>
  );
}
