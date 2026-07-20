'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Landing page for view-only access links (§2.C.2).
 * The 7-day viewer token travels in the URL fragment (never sent to the
 * server or logged), gets stored as the session token, and the viewer is
 * forwarded into the read-only app.
 */
export default function ViewerAccessPage() {
  const [state, setState] = useState<'working' | 'missing'>('working');

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) {
      setState('missing');
      return;
    }
    localStorage.setItem('auth_token', token);
    // Strip the token from the address bar before navigating.
    window.history.replaceState(null, '', window.location.pathname);
    window.location.replace('/app');
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <div className="font-serif text-2xl text-navy-900">LegacyVault</div>
        {state === 'working' ? (
          <p className="mt-4 text-ink-700">Opening your view-only access…</p>
        ) : (
          <>
            <p className="mt-4 text-ink-700">
              This access link is missing its key. Ask the account holder to copy the full link
              from their Viewer access settings and send it again — links also expire after 7
              days for security.
            </p>
            <Link href="/" className="mt-6 inline-block text-navy-700 underline">
              Back to LegacyVault
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
