'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/header';
import { getSiteCopy, getSiteLang } from '@/lib/site-copy';
import { withLang } from '@/lib/lang';

type Mode = 'login' | 'register' | 'editor' | 'apply-editor';

type SessionUser = {
  id?: string;
  email: string;
  name?: string;
  role?: 'author' | 'editor';
};

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState(getSiteLang());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setLang(getSiteLang(params.get('lang')));
    }
  }, []);
  const copy = useMemo(() => getSiteCopy(lang), [lang]);

  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function loadSession() {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const body = await response.json().catch(() => ({ data: null }));
      if (response.ok && body.data) {
        setSessionUser(body.data as SessionUser);
        return;
      }

      const raw = localStorage.getItem('if_user');
      if (!raw) return;
      try {
        setSessionUser(JSON.parse(raw) as SessionUser);
      } catch {
        setSessionUser(null);
      }
    }

    void loadSession();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);

    if (mode === 'apply-editor') {
      const statement = String(formData.get('statement') ?? '').trim();
      if (!sessionUser?.email) {
        setMessage(copy.login.applyNeedsAuth);
        setLoading(false);
        return;
      }
      if (statement.length < 20) {
        setMessage(copy.login.applyMinLength);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/editor/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement })
      });

      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      if (!response.ok) {
        setMessage(`${copy.login.failedPrefix}${body.error ?? 'request failed'}`);
        setLoading(false);
        return;
      }

      setMessage(body.reused ? copy.login.applyReused : copy.login.applySuccess);
      setLoading(false);
      return;
    }

    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      username: String(formData.get('username') ?? ''),
      identifier: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      editor_code: String(formData.get('editor_code') ?? '')
    };

    const endpoint =
      mode === 'register' ? '/api/auth/register' : mode === 'editor' ? '/api/auth/editor-login' : '/api/auth/login';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${copy.login.failedPrefix}${body.error ?? 'request failed'}`);
      setLoading(false);
      return;
    }

    const account = body.data;
    localStorage.setItem(
      'if_user',
      JSON.stringify({
        email: account.email,
        name: account.name ?? payload.name,
        id: account.id,
        role: account.role ?? 'author'
      })
    );

    setSessionUser({
      email: account.email,
      name: account.name ?? payload.name,
      id: account.id,
      role: account.role ?? (mode === 'editor' ? 'editor' : 'author')
    });

    setMessage(mode === 'register' ? copy.login.registerSuccess : mode === 'editor' ? copy.login.editorSuccess : copy.login.loginSuccess);
    setLoading(false);
    router.push(withLang(mode === 'editor' ? '/editor' : '/account', lang) as any);
  }

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">{copy.login.title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{copy.login.subtitle}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <button className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('login')} type="button">
          {copy.login.authorLogin}
        </button>
        <button className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('register')} type="button">
          {copy.login.authorRegister}
        </button>
        <button className={`btn ${mode === 'editor' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('editor')} type="button">
          {copy.login.editorLogin}
        </button>
        <button className={`btn ${mode === 'apply-editor' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('apply-editor')} type="button">
          {copy.login.editorApply}
        </button>
      </div>

      <form className="mt-6 max-w-lg glass-panel p-6" onSubmit={onSubmit}>
        {mode === 'apply-editor' ? (
          <>
            <p className="text-sm text-zinc-700">{copy.login.applyDescription}</p>
            <p className="mt-2 text-xs text-zinc-600">{copy.login.applyCurrentAccount}: {sessionUser?.email ?? copy.login.applyNoAccount}</p>
            {!sessionUser?.email ? <p className="mt-2 text-xs text-amber-700">{copy.login.applyNeedsAuth}</p> : null}
            <label className="mt-4 grid gap-1 text-sm">
              {copy.login.applyStatement}
              <textarea
                required
                name="statement"
                minLength={20}
                rows={4}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={copy.login.applyPlaceholder}
              />
            </label>
          </>
        ) : (
          <>
            {mode !== 'login' ? (
              <label className="grid gap-1 text-sm">
                {copy.login.name}
                <input name="name" required className="rounded border border-zinc-300 px-3 py-2" placeholder={copy.login.namePlaceholder} />
              </label>
            ) : null}

            {mode === 'register' ? (
              <label className="mt-4 grid gap-1 text-sm">
                {copy.login.usernameOptional}
                <input name="username" className="rounded border border-zinc-300 px-3 py-2" placeholder={copy.login.usernamePlaceholder} />
              </label>
            ) : null}

            <label className="mt-4 grid gap-1 text-sm">
              {mode === 'register' ? copy.login.email : mode !== 'editor' ? copy.login.emailOrUsername : copy.login.email}
              <input
                name="email"
                required
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={mode === 'editor' ? copy.login.editorEmailPlaceholder : mode === 'register' ? 'you@research.org' : copy.login.emailPlaceholder}
              />
            </label>

            {mode === 'editor' ? (
              <label className="mt-4 grid gap-1 text-sm">
                {copy.login.editorAccessCode}
                <input name="editor_code" required type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder={copy.login.editorCodePlaceholder} />
              </label>
            ) : (
              <label className="mt-4 grid gap-1 text-sm">
                {copy.login.password}
                <input name="password" required type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder="••••••••" />
              </label>
            )}
          </>
        )}

        <button disabled={loading} className="btn btn-primary mt-5 disabled:opacity-60" type="submit">
          {loading
            ? copy.login.processing
            : mode === 'register'
              ? copy.login.createAccount
              : mode === 'editor'
                ? copy.login.enterWorkspace
                : mode === 'apply-editor'
                  ? copy.login.applySubmit
                  : copy.login.signIn}
        </button>

        {mode === 'editor' ? <p className="mt-3 text-xs text-zinc-500">{copy.login.editorHint}</p> : null}
        {mode === 'apply-editor' ? <p className="mt-3 text-xs text-zinc-500">{copy.login.applyHint}</p> : null}

        {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}
      </form>
    </main>
  );
}
