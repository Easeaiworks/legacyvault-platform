'use client';

import Link from 'next/link';
import { useList } from '@/lib/hooks';

interface Conflict {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  suggestedAction?: string;
}

/**
 * Beneficiary audit surface — a warmly-styled card that surfaces the existing
 * conflict-detection engine's output on the dashboard.
 */
export function BeneficiaryAuditCard() {
  const { data: conflicts = [], isLoading } = useList<Conflict>(
    'beneficiary-conflicts',
    '/beneficiaries/conflicts',
  );

  if (isLoading) return null;

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-sage-300 bg-sage-100/40 p-6 shadow-soft">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-sage-700">
          Beneficiary audit
        </div>
        <div className="font-serif text-lg font-medium text-navy-900">
          No issues found.
        </div>
        <p className="mt-2 text-sm text-ink-700">
          Every account with a beneficiary designation looks correct — no missing
          designations, no over- or under-allocations, no accounts pointing at your estate
          instead of a person.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-terracotta-300 bg-terracotta-100/30 p-6 shadow-soft">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">
          Beneficiary audit
        </div>
        <div className="text-xs text-ink-500">
          {errors.length + warnings.length} issue{errors.length + warnings.length !== 1 && 's'}
        </div>
      </div>
      <div className="font-serif text-lg font-medium text-navy-900">
        {errors.length > 0
          ? `${errors.length} critical issue${errors.length > 1 ? 's' : ''} on your accounts`
          : `${warnings.length} thing${warnings.length > 1 ? 's' : ''} to review`}
      </div>
      <ul className="mt-4 space-y-2">
        {conflicts.slice(0, 3).map((c) => (
          <li key={c.id} className="text-sm text-ink-700">
            <span className="font-medium text-navy-900">{c.title}</span>
            <span className="text-ink-500"> — {c.detail}</span>
          </li>
        ))}
        {conflicts.length > 3 && (
          <li className="text-sm text-ink-500">…and {conflicts.length - 3} more.</li>
        )}
      </ul>
      <Link
        href="/app/beneficiaries"
        className="mt-4 inline-block rounded-md bg-terracotta-500 px-4 py-2 text-sm font-medium text-paper hover:bg-terracotta-700"
      >
        Review the audit →
      </Link>
    </div>
  );
}
