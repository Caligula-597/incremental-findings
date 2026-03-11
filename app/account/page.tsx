'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/header';
import { SectionTitle } from '@/components/ui-kit';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { withLang } from '@/lib/lang';

interface SessionUser {
  id?: string;
  email: string;
  name: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [lang, setLang] = useState(getSiteLang());
  const copy = useMemo(() => getSiteCopy(lang), [lang]);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [orcid, setOrcid] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [diagnostics, setDiagnostics] = useState<string>('');

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setLang(getSiteLang(params.get('lang')));

    const status = params.get('orcid');
    const tip = params.get('message');

    if (status === 'success') {
      setMessage(tip ? `${copy.account.orcidConnected} ${tip}` : copy.account.orcidConnected);
    }

    if (status === 'error') {
      setMessage(tip ? `${copy.account.orcidFailed}${tip}` : copy.account.orcidFailedGeneric);
    }
  }, [copy.account.orcidConnected, copy.account.orcidFailed, copy.account.orcidFailedGeneric]);

  useEffect(() => {
    async function loadOrcid() {
      if (!user?.email && !user?.id) return;
      const query = new URLSearchParams();
      if (user?.id) query.set('user_id', user.id);
      if (user?.email) query.set('email', user.email);

      const response = await fetch(`/api/orcid/status?${query.toString()}`);
      const body = await response.json().catch(() => ({ data: null }));
      if (body.data?.orcid_id) {
        setOrcid(body.data.orcid_id);
      }
    }
    void loadOrcid();
  }, [user?.email, user?.id]);

  async function connectOrcid() {
    if (!user?.email) {
      setMessage(copy.account.pleaseLoginFirst);
      return;
    }

    setMessage(copy.account.redirectingOrcid);

    const response = await fetch(`/api/orcid/start?email=${encodeURIComponent(user.email)}&user_id=${encodeURIComponent(user.id ?? '')}&force=true`);
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (!response.ok) {
      setMessage(body.error ?? copy.account.couldNotStart);
      return;
    }

    window.location.href = body.data.authorization_url;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('if_user');
    setUser(null);
    setOrcid(null);
    setMessage(copy.account.loggedOut);
    router.push(withLang('/login', lang) as any);
  }

  async function runOrcidDiagnostics() {
    const response = await fetch('/api/orcid/diagnostics');
    const body = await response.json().catch(() => ({ data: null }));
    if (!response.ok || !body.data) {
      setDiagnostics(copy.account.diagnosticsFailed);
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
          title={`${copy.account.welcome}${user?.name ? `, ${user.name}` : ''}`}
          subtitle={copy.account.subtitle}
          className="mb-0 text-white [&_p]:text-white/90 [&_h3]:text-4xl"
        />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="glass-panel p-6">
          <h3 className="font-serif text-3xl">{copy.account.identityTitle}</h3>
          <p className="mt-3 text-sm text-zinc-700">{copy.account.email}: {user?.email ?? copy.account.notLoggedIn}</p>
          <p className="mt-1 text-sm text-zinc-700">{copy.account.orcid}: {orcid ?? copy.account.notConnected}</p>

          <button type="button" onClick={connectOrcid} className="btn btn-primary mt-4">
            {orcid ? copy.account.reconnectOrcid : copy.account.connectOrcid}
          </button>
          <button type="button" onClick={logout} className="btn btn-secondary ml-2 mt-4">
            {copy.account.logout}
          </button>

          <div className="mt-6 rounded border border-zinc-200 bg-white p-4 text-sm">
            <p className="font-semibold">{copy.account.checklistTitle}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
              {copy.account.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="glass-panel p-6">
          <h3 className="font-serif text-2xl">{copy.account.quickActions}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a className="underline underline-offset-4" href={withLang('/submit', lang)}>
                {copy.account.startSubmission}
              </a>
            </li>
            <li>
              <a className="underline underline-offset-4" href={withLang('/editor', lang)}>
                {copy.account.openEditor}
              </a>
            </li>
            <li>
              <a className="underline underline-offset-4" href={withLang('/login', lang)}>
                {copy.account.switchAccount}
              </a>
            </li>
          </ul>
          <button type="button" onClick={runOrcidDiagnostics} className="btn btn-ghost mt-4">
            {copy.account.diagnostics}
          </button>
          {diagnostics ? <p className="mt-3 text-xs text-zinc-600">{diagnostics}</p> : null}
          {message ? <p className="mt-4 text-sm text-zinc-700">{message}</p> : null}
        </aside>
      </section>
    </main>
  );
}
