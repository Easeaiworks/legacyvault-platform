'use client';

import { useEffect, useState } from 'react';

type Country = 'US' | 'CA';

const STORAGE_KEY = 'lv_country';

/**
 * Two-flag pill for bi-national context switching.
 * Persists selection to localStorage; on next visit we start from what they picked.
 * Server-rendered as US default; client picks up localStorage after mount.
 */
export function FlagToggle({ compact = false }: { compact?: boolean }) {
  const [country, setCountry] = useState<Country>('US');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'US' || stored === 'CA') setCountry(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function pick(next: Country) {
    setCountry(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      // Cookie so server-rendered pages (guides, calculators) can read it.
      // 1 year, root path, SameSite=Lax.
      document.cookie = `lv_country=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch {
      /* ignore */
    }
    // Notify any listeners so downstream components can re-hydrate.
    window.dispatchEvent(new CustomEvent('lv:country-change', { detail: next }));
    // Force a soft reload so server-rendered content picks up the new cookie.
    if (typeof window !== 'undefined') window.location.reload();
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-100 p-1"
      role="tablist"
      aria-label="Country selector"
    >
      <button
        onClick={() => pick('US')}
        role="tab"
        aria-selected={country === 'US'}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          country === 'US'
            ? 'bg-paper text-navy-900 shadow-sm'
            : 'text-ink-500 hover:text-navy-700'
        }`}
      >
        <span aria-hidden>🇺🇸</span>
        {!compact && 'US'}
      </button>
      <button
        onClick={() => pick('CA')}
        role="tab"
        aria-selected={country === 'CA'}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          country === 'CA'
            ? 'bg-paper text-navy-900 shadow-sm'
            : 'text-ink-500 hover:text-navy-700'
        }`}
      >
        <span aria-hidden>🇨🇦</span>
        {!compact && 'CA'}
      </button>
      {mounted ? null : null}
    </div>
  );
}
