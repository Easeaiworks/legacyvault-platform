'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import { useCreate, useUpdate } from '@/lib/hooks';
import { CATEGORY_LABELS, typesForCountry, type Country } from '@/lib/asset-types';

interface AssetFormProps {
  asset?: {
    id: string;
    category: string;
    type: string;
    nickname: string;
    institutionName: string | null;
    estimatedValueCents: string | null;
    currency: string;
  };
  onClose: () => void;
}

// Modal form — drop-in for create or edit. Full-screen overlay.
export function AssetForm({ asset, onClose }: AssetFormProps) {
  const isEditing = Boolean(asset);
  const [country, setCountry] = useState<Country>('US');
  const [form, setForm] = useState({
    category: asset?.category ?? 'BANKING',
    type: asset?.type ?? 'CHECKING',
    nickname: asset?.nickname ?? '',
    institutionName: asset?.institutionName ?? '',
    accountNumber: '',
    estimatedValueDollars: asset?.estimatedValueCents
      ? (Number(asset.estimatedValueCents) / 100).toString()
      : '',
    currency: asset?.currency ?? 'USD',
    notes: '',
  });

  const create = useCreate('assets', '/assets');
  const update = useUpdate('assets', '/assets');
  const loading = create.isPending || update.isPending;

  async function save() {
    const payload = {
      category: form.category,
      type: form.type,
      nickname: form.nickname,
      institutionName: form.institutionName || undefined,
      accountNumber: form.accountNumber || undefined,
      estimatedValueCents: form.estimatedValueDollars
        ? BigInt(Math.round(Number(form.estimatedValueDollars) * 100)).toString()
        : undefined,
      currency: form.currency,
      notes: form.notes || undefined,
    };
    if (isEditing && asset) {
      await update.mutateAsync({ id: asset.id, data: payload as never });
    } else {
      await create.mutateAsync(payload as never);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-serif text-xl text-navy-900">
          {isEditing ? 'Edit asset' : 'Add asset'}
        </h2>
        <p className="mb-6 text-sm text-ink-500">
          Numbers go directly into your encrypted vault. Only the last 4 digits are retained for
          display.
        </p>

        {!isEditing && (
          <Field label="Country for tax-advantaged accounts">
            <Select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </Select>
          </Field>
        )}

        <Field label="Category">
          <Select
            value={form.category}
            onChange={(e) => {
              const cat = e.target.value;
              setForm({ ...form, category: cat, type: typesForCountry(cat, country)[0]?.value ?? 'OTHER_ASSET' });
            }}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {typesForCountry(form.category, country).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nickname">
          <Input
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            required
          />
        </Field>

        <Field label="Institution (optional)">
          <Input
            value={form.institutionName}
            onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
          />
        </Field>

        <Field
          label="Account number (optional)"
          hint="Encrypted. We'll show only the last 4 digits in lists."
        >
          <Input
            type="text"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Estimated value">
              <Input
                type="number"
                step="0.01"
                value={form.estimatedValueDollars}
                onChange={(e) => setForm({ ...form, estimatedValueDollars: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Currency">
            <Select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </Field>
        </div>

        <Field label="Notes (optional)">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Passphrase hints, physical location, anything your executor should know."
          />
        </Field>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!form.nickname || loading}>
            {loading ? 'Saving…' : isEditing ? 'Save changes' : 'Add asset'}
          </Button>
        </div>
      </div>
    </div>
  );
}
