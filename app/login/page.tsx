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
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [verificationRequested, setVerificationRequested] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setLang(getSiteLang(params.get('lang')));
    }
  }, []);

  const copy = useMemo(() => getSiteCopy(lang), [lang]);

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

  function resetRegisterVerification(email = '') {
    setPendingVerificationEmail(email.trim().toLowerCase());
    setVerificationCode('');
    setVerificationRequested(false);
  }

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
      editor_code: String(formData.get('editor_code') ?? ''),
      invite_code: String(formData.get('invite_code') ?? ''),
      editor_role: String(formData.get('editor_role') ?? ''),
      verification_code: verificationCode
    };

    if (mode === 'editor' && !payload.editor_code.trim() && !payload.invite_code.trim()) {
      setMessage(copy.login.editorNeedsCredential);
      setLoading(false);
      return;
    }

    if (mode === 'register') {
      if (!verificationRequested || !pendingVerificationEmail || pendingVerificationEmail !== payload.email.trim().toLowerCase()) {
        setMessage(copy.login.registerNeedsCode);
        setLoading(false);
        return;
      }
      if (!verificationCode) {
        setMessage(copy.login.registerNeedsCode);
        setLoading(false);
        return;
      }
    }

    const endpoint = mode === 'register' ? '/api/auth/register' : mode === 'editor' ? '/api/auth/editor-login' : '/api/auth/login';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      if (body.needs_verification && body.email) {
        setPendingVerificationEmail(String(body.email));
        setMessage(copy.login.loginNeedsVerification);
      } else {
        setMessage(`${copy.login.failedPrefix}${body.error ?? 'request failed'}`);
      }
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

    if (mode === 'register') {
      setPendingVerificationEmail('');
      setVerificationCode('');
      setVerificationRequested(false);
      setRegisterEmail('');
    }

    setMessage(mode === 'register' ? copy.login.registerSuccess : mode === 'editor' ? copy.login.editorSuccess : copy.login.loginSuccess);
    setLoading(false);
    router.push(withLang(mode === 'editor' ? '/editor' : '/account', lang) as any);
  }

  async function onVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingVerificationEmail) return;

    setLoading(true);
    setMessage('');
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerificationEmail, code: verificationCode })
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
        name: account.name,
        id: account.id,
        role: account.role ?? 'author'
      })
    );
    setSessionUser(account as SessionUser);
    setPendingVerificationEmail('');
    setVerificationCode('');
    setMessage(copy.login.verificationSuccess);
    setLoading(false);
    router.push(withLang('/account', lang) as any);
  }

  async function onSendRegisterCode() {
    const normalizedEmail = registerEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage(copy.login.registerNeedsEmail);
      return;
    }

    setLoading(true);
    setMessage('');
    const response = await fetch('/api/auth/register/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail })
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${copy.login.failedPrefix}${body.error ?? 'request failed'}`);
      setLoading(false);
      return;
    }

    setPendingVerificationEmail(normalizedEmail);
    setVerificationRequested(true);
    setMessage(copy.login.codeSentSuccess);
    setLoading(false);
  }

  async function onResendVerification() {
    if (!pendingVerificationEmail) return;

    setLoading(true);
    setMessage('');
    const endpoint = mode === 'register' ? '/api/auth/register/request-code' : '/api/auth/resend-verification';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingVerificationEmail })
    });

    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (!response.ok) {
      setMessage(`${copy.login.failedPrefix}${body.error ?? 'request failed'}`);
      setLoading(false);
      return;
    }

    setVerificationRequested(mode === 'register');
    setMessage(copy.login.verificationPrompt);
    setLoading(false);
  }

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">{copy.login.title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{copy.login.subtitle}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <button className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('login'); resetRegisterVerification(); }} type="button">
          {copy.login.authorLogin}
        </button>
        <button className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('register'); setMessage(''); }} type="button">
          {copy.login.authorRegister}
        </button>
        <button className={`btn ${mode === 'editor' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('editor'); resetRegisterVerification(); }} type="button">
          {copy.login.editorLogin}
        </button>
        <button className={`btn ${mode === 'apply-editor' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('apply-editor'); resetRegisterVerification(); }} type="button">
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
            {mode === 'editor' ? (
              <div className="mb-5 space-y-3 rounded-xl border border-zinc-200 bg-white/70 p-4">
                <p className="text-sm text-zinc-700">{copy.login.editorAccessIntro}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
                    <p className="text-sm font-semibold text-emerald-900">{copy.login.managingEditorTitle}</p>
                    <p className="mt-2 text-xs leading-5 text-emerald-800">{copy.login.managingEditorBody}</p>
                  </div>
                  <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-sky-900">{copy.login.reviewEditorTitle}</p>
                        <p className="mt-2 text-xs leading-5 text-sky-800">{copy.login.reviewEditorBody}</p>
                      </div>
                      <button
                        className="btn btn-secondary shrink-0"
                        onClick={() => { setMode('apply-editor'); resetRegisterVerification(); setMessage(''); }}
                        type="button"
                      >
                        {copy.login.reviewEditorCta}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

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
                value={mode === 'register' ? registerEmail : undefined}
                onChange={mode === 'register' ? (event) => {
                  const nextEmail = event.target.value;
                  setRegisterEmail(nextEmail);
                  if (pendingVerificationEmail && pendingVerificationEmail !== nextEmail.trim().toLowerCase()) {
                    setVerificationRequested(false);
                    setPendingVerificationEmail('');
                    setVerificationCode('');
                  }
                } : undefined}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={mode === 'editor' ? copy.login.editorEmailPlaceholder : mode === 'register' ? 'you@research.org' : copy.login.emailPlaceholder}
              />
            </label>

            {mode === 'register' ? (
              <div className="mt-4 rounded border border-zinc-200 bg-white/60 p-4">
                <p className="text-sm text-zinc-700">{copy.login.verificationPrompt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button disabled={loading} className="btn btn-secondary disabled:opacity-60" type="button" onClick={onSendRegisterCode}>
                    {copy.login.sendVerificationCode}
                  </button>
                  {verificationRequested ? (
                    <button disabled={loading} className="btn btn-secondary disabled:opacity-60" type="button" onClick={onResendVerification}>
                      {copy.login.resendVerification}
                    </button>
                  ) : null}
                </div>
                <label className="mt-4 grid gap-1 text-sm">
                  {copy.login.verificationCode}
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="rounded border border-zinc-300 px-3 py-2"
                    placeholder={copy.login.verificationCodePlaceholder}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                  />
                </label>
              </div>
            ) : null}

            {mode === 'editor' ? (
              <div className="mt-4 grid gap-3 rounded border border-zinc-200 bg-white/60 p-4">
                <label className="grid gap-1 text-sm">
                  {copy.login.editorRole}
                  <select name="editor_role" className="rounded border border-zinc-300 px-3 py-2">
                    <option value="managing_editor">{copy.login.managingEditorRoleOption}</option>
                    <option value="review_editor">{copy.login.reviewEditorRoleOption}</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  {copy.login.editorAccessCode}
                  <input name="editor_code" type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder={copy.login.editorCodePlaceholder} />
                </label>
                <p className="text-xs text-zinc-500">{copy.login.editorOrInviteDivider}</p>
                <label className="grid gap-1 text-sm">
                  {copy.login.editorInviteCode}
                  <input name="invite_code" type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder={copy.login.editorInviteCodePlaceholder} />
                </label>
              </div>
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

      {pendingVerificationEmail && mode !== 'register' ? (
        <form className="mt-5 max-w-lg rounded border border-zinc-200 bg-white/60 p-4" onSubmit={onVerifyEmail}>
          <p className="text-sm text-zinc-700">{copy.login.verificationPrompt}</p>
          <p className="mt-1 text-xs text-zinc-500">{pendingVerificationEmail}</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm">
              {copy.login.verificationCode}
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={copy.login.verificationCodePlaceholder}
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button disabled={loading} className="btn btn-primary disabled:opacity-60" type="submit">
                {copy.login.verifyCodeButton}
              </button>
              <button disabled={loading} className="btn btn-secondary disabled:opacity-60" type="button" onClick={onResendVerification}>
                {copy.login.resendVerification}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </main>
  );
}
