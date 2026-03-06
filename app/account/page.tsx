'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/header';

interface SessionUser {
  id?: string;
  email: string;
  name: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [orcid, setOrcid] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('if_user');
    if (!raw) return;
    const parsed = JSON.parse(raw) as SessionUser;
    setUser(parsed);
  }, []);

  useEffect(() => {
    async function loadOrcid() {
      if (!user?.email) return;
      const response = await fetch(`/api/orcid/status?email=${encodeURIComponent(user.email)}`);
      const body = await response.json().catch(() => ({ data: null }));
      if (body.data?.orcid_id) {
        setOrcid(body.data.orcid_id);
      }
    }
    void loadOrcid();
  }, [user?.email]);

  async function connectOrcid() {
    if (!user?.email) {
      setMessage('Please login first.');
      return;
    }

    const response = await fetch(`/api/orcid/start?email=${encodeURIComponent(user.email)}`);
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (!response.ok) {
      setMessage(body.error ?? 'Could not start ORCID flow');
      return;
    }

    window.location.href = body.data.authorization_url;
  }

  return (
    <main>
      <SiteHeader />

      <section className="rounded bg-[#084f74] px-6 py-8 text-white">
        <h2 className="font-serif text-4xl">Welcome back{user?.name ? `, ${user.name}` : ''}</h2>
        <p className="mt-2 text-white/90">Identity, ORCID and consent records are managed here before submissions.</p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded border border-zinc-300 bg-white/85 p-6">
          <h3 className="font-serif text-3xl">Identity and research profile</h3>
          <p className="mt-3 text-sm text-zinc-700">Email: {user?.email ?? 'Not logged in'}</p>
          <p className="mt-1 text-sm text-zinc-700">ORCID: {orcid ?? 'Not connected'}</p>

          <button type="button" onClick={connectOrcid} className="mt-4 rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800">
            {orcid ? 'Reconnect ORCID' : 'Connect ORCID'}
          </button>

          <div className="mt-6 rounded border border-zinc-200 bg-white p-4 text-sm">
            <p className="font-semibold">Author compliance checklist</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
              <li>Use a verified email account.</li>
              <li>Link ORCID for identity consistency (recommended).</li>
              <li>Accept author agreement and ethics declarations at submission time.</li>
              <li>Keep manuscript, cover letter and supporting files traceable.</li>
            </ul>
          </div>
        </div>

        <aside className="rounded border border-zinc-300 bg-white/85 p-6">
          <h3 className="font-serif text-2xl">Quick actions</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a className="underline underline-offset-4" href="/submit">
                Start new submission
              </a>
            </li>
            <li>
              <a className="underline underline-offset-4" href="/editor">
                Open editorial workspace
              </a>
            </li>
            <li>
              <a className="underline underline-offset-4" href="/login">
                Switch account
              </a>
            </li>
          </ul>
          {message ? <p className="mt-4 text-sm text-zinc-700">{message}</p> : null}
        </aside>
      </section>
    </main>
  );
}
