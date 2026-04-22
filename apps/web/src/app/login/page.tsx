'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ redirectUrl?: string; devToken?: string }>(
        '/auth/login/start',
        { email },
      );
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else if (res.devToken) {
        // Dev fallback — store token and go to dashboard.
        localStorage.setItem('auth_token', res.devToken);
        router.push('/app');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-serif text-2xl text-navy-900">
          LegacyVault
        </Link>
        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-ink-200 bg-white p-8 shadow-sm"
          noValidate
        >
          <h1 className="mb-1 font-serif text-2xl text-navy-900">Sign in</h1>
          <p className="mb-6 text-sm text-ink-500">
            We&apos;ll email you a secure sign-in link. No passwords.
          </p>

          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-ink-300 px-3 py-2 focus:border-navy-500"
          />

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-navy-700 px-4 py-2 font-medium text-ink-50 hover:bg-navy-900 disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Continue'}
          </button>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-navy-700 underline">
              Get started
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
