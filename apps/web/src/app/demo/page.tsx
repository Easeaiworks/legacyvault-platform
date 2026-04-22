'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PendingReviewBadge } from '@/components/pending-review-badge';

/**
 * Demo auto-login page. When a visitor navigates to /demo, we:
 *   1. Call POST /auth/demo/login (public endpoint, gated on DEMO_MODE=true)
 *   2. Store the returned token in localStorage
 *   3. Redirect to the app
 *
 * Anyone with the URL can enter the demo — by design. This page is only
 * intended to exist in the demo deployment; production builds should
 * either remove this route or rely on the API returning 401 because
 * DEMO_MODE is not set.
 */
export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { token } = await apiClient.post<{ token: string }>('/auth/demo/login', {});
        if (cancelled) return;
        localStorage.setItem('auth_token', token);
        router.replace('/app');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Demo login unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-6">
      <div className="max-w-lg text-center">
        <h1 className="mb-4 font-serif text-3xl text-navy-900">Loading the LegacyVault demo…</h1>
        {error ? (
          <>
            <p className="mb-4 text-red-700">{error}</p>
            <p className="text-ink-500">
              Demo access isn&apos;t available on this environment. Try{' '}
              <a href="/" className="text-navy-700 underline">the marketing site</a>{' '}
              or{' '}
              <a href="/register" className="text-navy-700 underline">register normally</a>.
            </p>
          </>
        ) : (
          <p className="text-ink-500">
            Signing you in as <strong>Ada Lovelace</strong> with a fully populated estate so you
            can explore every feature.
          </p>
        )}
        <div className="mt-6">
          <PendingReviewBadge compact>
            This is a demo environment. All data is synthetic; no real persons,
            assets, or communications are involved. Forward-looking product
            features are shown for legal review.
          </PendingReviewBadge>
        </div>
      </div>
    </main>
  );
}
