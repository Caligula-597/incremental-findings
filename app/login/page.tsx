'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/header';

type Mode = 'login' | 'register' | 'editor';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
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
      setMessage(`Failed: ${body.error ?? 'request failed'}`);
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

    setMessage(mode === 'register' ? 'Registration successful.' : mode === 'editor' ? 'Editor login successful.' : 'Login successful.');
    setLoading(false);
    router.push(mode === 'editor' ? '/editor' : '/account');
  }

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Author & editor access</h2>
      <p className="mt-2 text-sm text-zinc-600">作者用于投稿，编辑使用专属访问码进入审稿工作台。</p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <button className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('login')} type="button">
          Author Log in
        </button>
        <button
          className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('register')}
          type="button"
        >
          Author Register
        </button>
        <button className={`btn ${mode === 'editor' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('editor')} type="button">
          Editor Log in
        </button>
      </div>

      <form className="mt-6 max-w-lg glass-panel p-6" onSubmit={onSubmit}>
        {mode !== 'login' ? (
          <label className="grid gap-1 text-sm">
            Name
            <input name="name" required className="rounded border border-zinc-300 px-3 py-2" placeholder="Your full name" />
          </label>
        ) : null}

        <label className="mt-4 grid gap-1 text-sm">
          Email{mode !== 'editor' ? ' or username' : ''}
          <input
            name="email"
            required
            className="rounded border border-zinc-300 px-3 py-2"
            placeholder={mode === 'editor' ? 'editor@journal.org' : 'you@research.org or your_username'}
          />
        </label>

        {mode === 'editor' ? (
          <label className="mt-4 grid gap-1 text-sm">
            Editor access code
            <input
              name="editor_code"
              required
              type="password"
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="Provided by admin"
            />
          </label>
        ) : (
          <label className="mt-4 grid gap-1 text-sm">
            Password
            <input name="password" required type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder="••••••••" />
          </label>
        )}

        <button disabled={loading} className="btn btn-primary mt-5 disabled:opacity-60" type="submit">
          {loading
            ? 'Processing...'
            : mode === 'register'
              ? 'Create account'
              : mode === 'editor'
                ? 'Enter editorial workspace'
                : 'Sign in'}
        </button>

        {mode === 'editor' ? (
          <p className="mt-3 text-xs text-zinc-500">
            演示环境默认编辑码为 <code>review-demo</code>；生产环境请通过 <code>EDITOR_ACCESS_CODE</code> 配置。
          </p>
        ) : null}

        {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}
      </form>
    </main>
  );
}
