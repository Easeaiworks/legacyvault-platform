'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useList, useRemove } from '@/lib/hooks';
import { CATEGORY_LABELS } from '@/lib/asset-types';
import { AssetForm } from './asset-form';

interface Asset {
  id: string;
  category: string;
  type: string;
  nickname: string;
  institutionName: string | null;
  accountLast4: string | null;
  estimatedValueCents: string | null;
  currency: string;
  status: string;
}

export default function AssetsPage() {
  const { data: assets = [], isLoading } = useList<Asset>('assets', '/assets');
  const remove = useRemove('assets', '/assets');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [creating, setCreating] = useState(false);

  const totalCents = useMemo(
    () => assets.reduce((sum, a) => sum + (a.estimatedValueCents ? Number(a.estimatedValueCents) : 0), 0),
    [assets],
  );

  const grouped = useMemo(() => {
    const g = new Map<string, Asset[]>();
    for (const a of assets) {
      const list = g.get(a.category) ?? [];
      list.push(a);
      g.set(a.category, list);
    }
    return g;
  }, [assets]);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Assets</h1>
          <p className="mt-1 text-ink-500">
            {assets.length} items documented{' '}
            {totalCents > 0 && `· ~$${(totalCents / 100).toLocaleString()} total`}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Add asset</Button>
      </div>

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && assets.length === 0 && (
        <EmptyState
          title="No assets yet"
          body="Start with something top-of-mind — a checking account, 401(k), or your home."
          action={<Button onClick={() => setCreating(true)}>Add your first asset</Button>}
        />
      )}

      {Array.from(grouped.entries()).map(([cat, items]) => (
        <Card key={cat} className="mb-6">
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[cat] ?? cat}</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {items.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-navy-900">{a.nickname}</div>
                  <div className="text-sm text-ink-500">
                    {a.institutionName ?? '—'}
                    {a.accountLast4 && ` · ****${a.accountLast4}`}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right text-sm">
                    <div className="font-medium text-navy-900">
                      {a.estimatedValueCents
                        ? `$${(Number(a.estimatedValueCents) / 100).toLocaleString()}`
                        : '—'}
                    </div>
                    <div className="text-xs text-ink-500">{a.currency}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${a.nickname}? This can't be undone from the UI.`)) {
                          remove.mutate(a.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {(creating || editing) && (
        <AssetForm
          asset={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
