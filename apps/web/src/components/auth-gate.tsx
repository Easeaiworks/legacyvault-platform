'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Dev-mode auth gate: checks for a token in localStorage, redirects to /login if absent.
 * In production, this is replaced with a server-side session check via WorkOS AuthKit
 * (the next-auth equivalent) — see docs/auth-upgrade.md (TODO Session 2).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-500">
        Loading your vault…
      </div>
    );
  }
  return <>{children}</>;
}
