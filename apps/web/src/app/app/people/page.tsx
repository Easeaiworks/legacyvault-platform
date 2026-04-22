'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import { useList, useCreate, useRemove } from '@/lib/hooks';
import { RELATIONSHIP_LABELS } from '@/lib/asset-types';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  email: string | null;
}

export default function PeoplePage() {
  const { data: persons = [], isLoading } = useList<Person>('persons', '/persons');
  const remove = useRemove('persons', '/persons');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">People</h1>
          <p className="mt-1 text-ink-500">
            The people in your life who appear in your estate — family, executors, advisors.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Add person</Button>
      </div>

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && persons.length === 0 && (
        <EmptyState
          title="No people yet"
          body="Add the people you'd name as beneficiaries, executors, or trusted contacts. You can add more at any time."
          action={<Button onClick={() => setCreating(true)}>Add someone</Button>}
        />
      )}

      {persons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All people</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {persons.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-navy-900">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-sm text-ink-500">
                    {RELATIONSHIP_LABELS[p.relationship] ?? p.relationship}
                    {p.email && ` · ${p.email}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirm(`Remove ${p.firstName}?`) && remove.mutate(p.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && <PersonForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function PersonForm({ onClose }: { onClose: () => void }) {
  const create = useCreate('persons', '/persons');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    relationship: 'SPOUSE',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  async function save() {
    await create.mutateAsync({
      firstName: form.firstName,
      lastName: form.lastName,
      relationship: form.relationship,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    } as never);
    onClose();
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
        <h2 className="mb-6 font-serif text-xl text-navy-900">Add person</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last name">
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Relationship">
          <Select
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          >
            {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Email (optional)">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>

        <Field label="Phone (optional)" hint="Encrypted at rest.">
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>

        <Field label="Address (optional)" hint="Encrypted at rest.">
          <Textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>

        <Field label="Notes (optional)">
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={!form.firstName || !form.lastName || create.isPending}
          >
            {create.isPending ? 'Saving…' : 'Add person'}
          </Button>
        </div>
      </div>
    </div>
  );
}
