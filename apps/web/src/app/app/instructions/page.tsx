'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import { useList, useCreate, useRemove } from '@/lib/hooks';
import { INSTRUCTION_CATEGORY_LABELS } from '@/lib/asset-types';

interface Instruction {
  id: string;
  category: string;
  title: string;
  createdAt: string;
}

export default function InstructionsPage() {
  const { data: items = [], isLoading } = useList<Instruction>('instructions', '/instructions');
  const remove = useRemove('instructions', '/instructions');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Letters &amp; wishes</h1>
          <p className="mt-1 text-ink-500">
            Thoughts, instructions, and personal messages. Encrypted and shared only on your terms.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Write something</Button>
      </div>

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && items.length === 0 && (
        <EmptyState
          title="Nothing written yet"
          body="A letter of wishes for your executor, funeral preferences, instructions for pet care — all here, private until you decide otherwise."
          action={<Button onClick={() => setCreating(true)}>Write your first letter</Button>}
        />
      )}

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your letters and wishes</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-navy-900">{i.title}</div>
                  <div className="text-sm text-ink-500">
                    {INSTRUCTION_CATEGORY_LABELS[i.category] ?? i.category} ·{' '}
                    {new Date(i.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirm(`Delete "${i.title}"?`) && remove.mutate(i.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && <InstructionForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function InstructionForm({ onClose }: { onClose: () => void }) {
  const create = useCreate('instructions', '/instructions');
  const [form, setForm] = useState({
    category: 'LETTER_OF_WISHES',
    title: '',
    body: '',
  });

  async function save() {
    await create.mutateAsync(form as never);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 font-serif text-xl text-navy-900">Write a letter or instruction</h2>

        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(INSTRUCTION_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Letter to my executor, Service preferences, Caring for Luna"
          />
        </Field>

        <Field label="Message">
          <Textarea
            rows={12}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Take your time. You can edit this later."
          />
        </Field>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!form.title || !form.body || create.isPending}>
            {create.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
