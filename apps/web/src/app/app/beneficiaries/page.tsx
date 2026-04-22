'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Field } from '@/components/ui/input';
import { useList, useCreate, useRemove } from '@/lib/hooks';
import { bpsToPercent, percentToBps } from '@legacyvault/shared';

interface Beneficiary {
  id: string;
  designation: string;
  shareBps: number;
  conditions: string | null;
  asset: { id: string; nickname: string; category: string };
  person: { id: string; firstName: string; lastName: string; relationship: string };
}

interface Conflict {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  suggestedAction?: string;
}

interface Asset { id: string; nickname: string; category: string; type: string }
interface Person { id: string; firstName: string; lastName: string; relationship: string }

export default function BeneficiariesPage() {
  const { data: beneficiaries = [], isLoading } = useList<Beneficiary>('beneficiaries', '/beneficiaries');
  const { data: conflicts = [] } = useList<Conflict>('beneficiary-conflicts', '/beneficiaries/conflicts');
  const { data: assets = [] } = useList<Asset>('assets', '/assets');
  const { data: persons = [] } = useList<Person>('persons', '/persons');
  const remove = useRemove('beneficiaries', '/beneficiaries');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Beneficiaries</h1>
          <p className="mt-1 text-ink-500">
            Who inherits what. Shares must total 100% per asset.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={assets.length === 0 || persons.length === 0}>
          Add beneficiary
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-6 space-y-2">
          {conflicts.map((c) => (
            <div
              key={c.id}
              className={`rounded-md border p-4 ${
                c.severity === 'error'
                  ? 'border-red-300 bg-red-50'
                  : c.severity === 'warning'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-blue-300 bg-blue-50'
              }`}
            >
              <div className="font-medium text-ink-900">{c.title}</div>
              <div className="mt-1 text-sm text-ink-700">{c.detail}</div>
              {c.suggestedAction && (
                <div className="mt-2 text-sm font-medium text-navy-700">→ {c.suggestedAction}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {(assets.length === 0 || persons.length === 0) && (
        <EmptyState
          title="Add assets and people first"
          body="Beneficiaries connect an asset to a person. Add at least one of each, then come back here."
        />
      )}

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && beneficiaries.length === 0 && assets.length > 0 && persons.length > 0 && (
        <EmptyState
          title="No beneficiaries yet"
          body="Designate who should inherit each asset. Primary beneficiaries receive first, then contingent."
          action={<Button onClick={() => setCreating(true)}>Add your first beneficiary</Button>}
        />
      )}

      {beneficiaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All beneficiary designations</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {beneficiaries.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-navy-900">
                    {b.person.firstName} {b.person.lastName}{' '}
                    <span className="font-normal text-ink-500">
                      — {b.designation.toLowerCase()} on {b.asset.nickname}
                    </span>
                  </div>
                  <div className="text-sm text-ink-500">
                    {bpsToPercent(b.shareBps).toFixed(2)}% share
                    {b.conditions && ` · ${b.conditions}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirm('Remove this beneficiary designation?') && remove.mutate(b.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && (
        <BeneficiaryForm
          assets={assets}
          persons={persons}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function BeneficiaryForm({
  assets,
  persons,
  onClose,
}: {
  assets: Asset[];
  persons: Person[];
  onClose: () => void;
}) {
  const create = useCreate('beneficiaries', '/beneficiaries');
  const [form, setForm] = useState({
    assetId: assets[0]?.id ?? '',
    personId: persons[0]?.id ?? '',
    designation: 'PRIMARY',
    sharePercent: '100',
    conditions: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await create.mutateAsync({
        assetId: form.assetId,
        personId: form.personId,
        designation: form.designation,
        shareBps: percentToBps(Number(form.sharePercent)),
        conditions: form.conditions || undefined,
      } as never);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 font-serif text-xl text-navy-900">Add beneficiary</h2>

        <Field label="Asset">
          <Select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Person">
          <Select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} — {p.relationship.toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Designation">
          <Select
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          >
            <option value="PRIMARY">Primary</option>
            <option value="CONTINGENT">Contingent</option>
            <option value="TERTIARY">Tertiary</option>
          </Select>
        </Field>

        <Field label="Share (%)">
          <Input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={form.sharePercent}
            onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
          />
        </Field>

        <Field label="Conditions (optional)" hint="e.g., 'upon reaching age 25'">
          <Input
            value={form.conditions}
            onChange={(e) => setForm({ ...form, conditions: e.target.value })}
          />
        </Field>

        {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Add beneficiary'}
          </Button>
        </div>
      </div>
    </div>
  );
}
