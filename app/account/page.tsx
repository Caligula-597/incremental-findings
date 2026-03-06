'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';

interface SessionUser {
  id?: string;
  email: string;
  name: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [orcid, setOrcid] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [diagnostics, setDiagnostics] = useState<string>('');

  useEffect(() => {
    const raw = localStorage.getItem('if_user');
    if (!raw) return;
    const parsed = JSON.parse(raw) as SessionUser;
    setUser(parsed);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('orcid');
    const tip = params.get('message');

    if (status === 'success') {
      setMessage(tip ? `ORCID connected. ${tip}` : 'ORCID connected successfully.');
    }

    if (status === 'error') {
      setMessage(tip ? `ORCID connection failed: ${tip}` : 'ORCID connection failed.');
    }
  }, []);

  useEffect(() => {
    async function loadOrcid() {
      if (!user?.email && !user?.id) return;
      const query = user?.id ? `user_id=${encodeURIComponent(user.id)}` : `email=${encodeURIComponent(user?.email ?? '')}`;
      const response = await fetch(`/api/orcid/status?${query}`);
      const body = await response.json().catch(() => ({ data: null }));
      if (body.data?.orcid_id) {
        setOrcid(body.data.orcid_id);
      }
    }
    void loadOrcid();
  }, [user?.email, user?.id]);

  async function connectOrcid() {
    if (!user?.email) {
      setMessage('Please login first.');
      return;
    }

    setMessage('Redirecting to ORCID… if this account already authorized before, ORCID may return directly.');

    const response = await fetch(
      `/api/orcid/start?email=${encodeURIComponent(user.email)}&user_id=${encodeURIComponent(user.id ?? '')}&force=true`
    );
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (!response.ok) {
      setMessage(body.error ?? 'Could not start ORCID flow');
      return;
    }

    window.location.href = body.data.authorization_url;
  }

  function logout() {
    localStorage.removeItem('if_user');
    setUser(null);
    setOrcid(null);
    setMessage('You have been logged out.');
    router.push('/login');
  }


  async function runOrcidDiagnostics() {
    const response = await fetch('/api/orcid/diagnostics');
    const body = await response.json().catch(() => ({ data: null }));
    if (!response.ok || !body.data) {
      setDiagnostics('Could not load diagnostics.');
      return;
    }

    const d = body.data;
    setDiagnostics(
      [
        `client_id_present=${d.env.client_id_present}`,
        `client_secret_present=${d.env.client_secret_present}`,
        `client_id_prefix=${d.env.client_id_prefix ?? 'null'}`,
        `secret_len=${d.env.client_secret_length}`,
        `configured_callback=${d.runtime.configured_callback ?? 'null'}`,
        `expected_callback=${d.runtime.expected_callback_from_request}`,
        `callback_match=${d.runtime.callback_matches_request_host}`
      ].join(' | ')
    );
  }
  return (
    <main>
      <SiteHeader />

      <section className="rounded bg-[#084f74] px-6 py-8 text-white">
        <SectionTitle
          title={`Welcome back${user?.name ? `, ${user.name}` : ''}`}
          subtitle="Identity, ORCID and consent records are managed here before submissions."
          className="mb-0 text-white [&_p]:text-white/90 [&_h3]:text-4xl"
        />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="glass-panel p-6">
          <h3 className="font-serif text-3xl">Identity and research profile</h3>
          <p className="mt-3 text-sm text-zinc-700">Email: {user?.email ?? 'Not logged in'}</p>
          <p className="mt-1 text-sm text-zinc-700">ORCID: {orcid ?? 'Not connected'}</p>

          <button type="button" onClick={connectOrcid} className="btn btn-primary mt-4">
            {orcid ? 'Reconnect ORCID' : 'Connect ORCID'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="btn btn-secondary ml-2 mt-4"
          >
            Log out
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

        <aside className="glass-panel p-6">
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
          <button type="button" onClick={runOrcidDiagnostics} className="btn btn-ghost mt-4">
            Run ORCID diagnostics
          </button>
          {diagnostics ? <p className="mt-3 text-xs text-zinc-600">{diagnostics}</p> : null}
          {message ? <p className="mt-4 text-sm text-zinc-700">{message}</p> : null}
        </aside>
      </section>
    </main>
  );
}
