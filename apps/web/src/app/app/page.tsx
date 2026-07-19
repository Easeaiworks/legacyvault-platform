'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useList } from '@/lib/hooks';
import { ReadinessScoreDial } from '@/components/readiness-score-dial';
import { BeneficiaryAuditCard } from '@/components/beneficiary-audit-card';

export default function AppOverview() {
  const { data: assets = [] } = useList<{
    id: string;
    estimatedValueCents: string | null;
  }>('assets', '/assets');
  const { data: docs = [] } = useList<{ id: string }>('documents', '/documents');
  const { data: contacts = [] } = useList<{ id: string }>('trusted-contacts', '/trusted-contacts');

  const total = assets.reduce(
    (s, a) => s + (a.estimatedValueCents ? Number(a.estimatedValueCents) : 0),
    0,
  );

  async function downloadBinder() {
    const token = localStorage.getItem('auth_token');
    const base = process.env.NEXT_PUBLIC_API_URL ?? '/api';
    const res = await fetch(`${base}/export/estate-binder.pdf`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return alert('Failed to generate PDF');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estate-binder-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl font-medium text-navy-900">Overview</h1>
          <p className="mt-1 text-ink-500">Your vault at a glance.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={downloadBinder}>
            Download estate binder
          </Button>
        </div>
      </div>

      {/* Estate Readiness Score — the headline metric */}
      <div className="mb-8">
        <ReadinessScoreDial />
      </div>

      {/* Beneficiary Audit + Stats grid */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <BeneficiaryAuditCard />
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Assets" value={String(assets.length)} href="/app/assets" />
          <Stat
            label="Estimated value"
            value={total > 0 ? `$${(total / 100).toLocaleString()}` : '—'}
            href="/app/assets"
          />
          <Stat label="Documents" value={String(docs.length)} href="/app/documents" />
          <Stat
            label="Trusted contacts"
            value={String(contacts.length)}
            href="/app/contacts"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-ink-200 bg-paper p-5 shadow-soft transition-colors hover:border-navy-300">
      <div className="text-xs font-semibold uppercase tracking-widest text-ink-500">
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-medium text-navy-900">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
