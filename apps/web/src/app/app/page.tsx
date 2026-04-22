'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useList } from '@/lib/hooks';

export default function AppOverview() {
  const { data: assets = [] } = useList<{ id: string; estimatedValueCents: string | null }>('assets', '/assets');
  const { data: docs = [] } = useList<{ id: string }>('documents', '/documents');
  const { data: contacts = [] } = useList<{ id: string }>('trusted-contacts', '/trusted-contacts');
  const { data: persons = [] } = useList<{ id: string }>('persons', '/persons');
  const { data: beneficiaries = [] } = useList<{ id: string }>('beneficiaries', '/beneficiaries');
  const { data: conflicts = [] } = useList<{ severity: string }>('beneficiary-conflicts', '/beneficiaries/conflicts');

  const total = assets.reduce((s, a) => s + (a.estimatedValueCents ? Number(a.estimatedValueCents) : 0), 0);
  const errorConflicts = conflicts.filter((c) => c.severity === 'error').length;
  const warningConflicts = conflicts.filter((c) => c.severity === 'warning').length;

  const completeness = calculateCompleteness({
    hasAsset: assets.length > 0,
    hasDoc: docs.length > 0,
    hasPerson: persons.length > 0,
    hasBeneficiary: beneficiaries.length > 0,
    hasContact: contacts.length > 0,
  });

  async function downloadBinder() {
    const token = localStorage.getItem('auth_token');
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1') + '/export/estate-binder.pdf', {
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
          <h1 className="font-serif text-3xl text-navy-900">Overview</h1>
          <p className="mt-1 text-ink-500">Your vault at a glance.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={downloadBinder}>
            Download estate binder
          </Button>
        </div>
      </div>

      {/* Completeness */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your plan is {completeness.percent}% complete</CardTitle>
        </CardHeader>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full bg-accent-500 transition-all"
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
        <ul className="space-y-2 text-sm">
          {completeness.steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className={s.done ? 'text-green-700' : 'text-ink-300'}>
                {s.done ? '✓' : '○'}
              </span>
              <span className={s.done ? 'text-ink-500 line-through' : 'text-ink-700'}>
                {s.label}
              </span>
              {!s.done && s.href && (
                <Link href={s.href} className="ml-auto text-sm text-navy-700 underline">
                  Start
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mb-6 grid gap-6 md:grid-cols-4">
        <Stat label="Assets" value={String(assets.length)} href="/app/assets" />
        <Stat
          label="Estimated value"
          value={total > 0 ? `$${(total / 100).toLocaleString()}` : '—'}
          href="/app/assets"
        />
        <Stat label="Documents" value={String(docs.length)} href="/app/documents" />
        <Stat label="Trusted contacts" value={String(contacts.length)} href="/app/contacts" />
      </div>

      {(errorConflicts > 0 || warningConflicts > 0) && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle>Action items for your beneficiaries</CardTitle>
          </CardHeader>
          <p className="text-sm text-ink-700">
            {errorConflicts > 0 && `${errorConflicts} critical issue${errorConflicts > 1 ? 's' : ''}. `}
            {warningConflicts > 0 && `${warningConflicts} warning${warningConflicts > 1 ? 's' : ''}. `}
            <Link href="/app/beneficiaries" className="underline">
              Review on the beneficiaries page →
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-navy-300">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 font-serif text-3xl text-navy-900">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function calculateCompleteness(input: {
  hasAsset: boolean;
  hasDoc: boolean;
  hasPerson: boolean;
  hasBeneficiary: boolean;
  hasContact: boolean;
}) {
  const steps = [
    { label: 'Document your first asset', done: input.hasAsset, href: '/app/assets' },
    { label: 'Add someone in your life', done: input.hasPerson, href: '/app/people' },
    { label: 'Upload your will or a key document', done: input.hasDoc, href: '/app/documents' },
    { label: 'Designate a beneficiary', done: input.hasBeneficiary, href: '/app/beneficiaries' },
    { label: 'Add a trusted contact', done: input.hasContact, href: '/app/contacts' },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, percent: Math.round((done / steps.length) * 100) };
}
