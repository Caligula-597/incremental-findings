'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/header';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
      password: String(formData.get('password') ?? '')
    };

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
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
    localStorage.setItem('if_user', JSON.stringify({ email: account.email, name: account.name ?? payload.name, id: account.id }));
    setMessage(mode === 'register' ? 'Registration successful.' : 'Login successful.');
    setLoading(false);
    router.push('/account');
  }

  return (
    <main>
      <SiteHeader />
      <h2 className="font-serif text-3xl">Author account access</h2>
      <p className="mt-2 text-sm text-zinc-600">Use email or username to sign in; ORCID linking is available inside Account settings.</p>

      <div className="mt-5 flex gap-2 text-sm">
        <button
          className={`rounded border px-3 py-1 ${mode === 'login' ? 'border-black bg-black text-white' : 'border-zinc-400'}`}
          onClick={() => setMode('login')}
          type="button"
        >
          Log in
        </button>
        <button
          className={`rounded border px-3 py-1 ${mode === 'register' ? 'border-black bg-black text-white' : 'border-zinc-400'}`}
          onClick={() => setMode('register')}
          type="button"
        >
          Register
        </button>
      </div>

      <form className="mt-6 max-w-lg glass-panel p-6" onSubmit={onSubmit}>
        {mode === 'register' ? (
          <label className="grid gap-1 text-sm">
            Name
            <input name="name" required className="rounded border border-zinc-300 px-3 py-2" placeholder="Your full name" />
          </label>
        ) : null}

        <label className="mt-4 grid gap-1 text-sm">
          Email or username
          <input name="email" required className="rounded border border-zinc-300 px-3 py-2" placeholder="you@research.org or your_username" />
        </label>

        <label className="mt-4 grid gap-1 text-sm">
          Password
          <input name="password" required type="password" className="rounded border border-zinc-300 px-3 py-2" placeholder="••••••••" />
        </label>

        <button disabled={loading} className="mt-5 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60" type="submit">
          {loading ? 'Processing...' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>

        {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}
      </form>
    </main>
  );
}
