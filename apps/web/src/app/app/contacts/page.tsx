'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import { useList, useCreate, useRemove } from '@/lib/hooks';
import { apiClient } from '@/lib/api-client';
import { ACCESS_TIER_LABELS, RELATIONSHIP_LABELS } from '@/lib/asset-types';

interface TrustedContact {
  id: string;
  accessTier: string;
  triggerType: string;
  waitingPeriodDays: number;
  person: { id: string; firstName: string; lastName: string; email: string | null; relationship: string };
  accessGrants: Array<{ status: string; unlocksAt: string | null }>;
}

interface CheckInStatus {
  lastCheckInAt: string | null;
  nextDueAt: string | null;
  daysUntilDue: number;
  status: 'healthy' | 'due-soon' | 'overdue';
}

interface Person { id: string; firstName: string; lastName: string; relationship: string }

export default function ContactsPage() {
  const { data: contacts = [], isLoading } = useList<TrustedContact>('trusted-contacts', '/trusted-contacts');
  const { data: status } = useList<CheckInStatus>('check-in-status', '/trusted-contacts/check-in/status');
  const { data: persons = [] } = useList<Person>('persons', '/persons');
  const remove = useRemove('trusted-contacts', '/trusted-contacts');
  const [creating, setCreating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  async function checkIn() {
    setCheckingIn(true);
    try {
      await apiClient.post('/trusted-contacts/check-in', {});
    } finally {
      setCheckingIn(false);
      // Refetch status
      window.location.reload();
    }
  }

  const checkInStatus = (status as unknown as CheckInStatus) ?? null;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Trusted contacts</h1>
          <p className="mt-1 text-ink-500">
            People who can access your vault — under the conditions you set.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={persons.length === 0}>
          Add contact
        </Button>
      </div>

      {/* Dead-man's-switch status */}
      {checkInStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Check-in status</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  checkInStatus.status === 'healthy'
                    ? 'bg-green-100 text-green-900'
                    : checkInStatus.status === 'due-soon'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-red-100 text-red-900'
                }`}
              >
                {checkInStatus.status === 'healthy'
                  ? 'Healthy'
                  : checkInStatus.status === 'due-soon'
                    ? 'Due soon'
                    : 'Overdue'}
              </div>
              <div className="mt-2 text-sm text-ink-500">
                {checkInStatus.lastCheckInAt
                  ? `Last check-in: ${new Date(checkInStatus.lastCheckInAt).toLocaleDateString()}`
                  : 'You haven\'t checked in yet.'}
              </div>
              <div className="text-sm text-ink-500">
                Next due in {checkInStatus.daysUntilDue} days.
              </div>
            </div>
            <Button onClick={checkIn} disabled={checkingIn}>
              {checkingIn ? 'Checking in…' : "I'm here — check me in"}
            </Button>
          </div>
        </Card>
      )}

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && contacts.length === 0 && persons.length > 0 && (
        <EmptyState
          title="No trusted contacts yet"
          body="Add someone you trust to gain access to your vault if something happens to you. You decide what they can see and when."
          action={<Button onClick={() => setCreating(true)}>Add your first contact</Button>}
        />
      )}

      {persons.length === 0 && (
        <EmptyState
          title="Add a person first"
          body="Trusted contacts are drawn from the people in your life. Go add someone on the People page first."
        />
      )}

      {contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your trusted contacts</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {contacts.map((tc) => (
              <li key={tc.id} className="flex items-start justify-between py-4">
                <div>
                  <div className="font-medium text-navy-900">
                    {tc.person.firstName} {tc.person.lastName}{' '}
                    <span className="font-normal text-ink-500">
                      — {RELATIONSHIP_LABELS[tc.person.relationship]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-ink-500">
                    <span className="font-medium">{ACCESS_TIER_LABELS[tc.accessTier].split(' — ')[0]}</span>
                    {' · '}trigger: {tc.triggerType.replace('_', ' ').toLowerCase()}
                    {' · '}waiting period: {tc.waitingPeriodDays} days
                  </div>
                  {tc.accessGrants[0]?.status === 'TRIGGERED' && (
                    <div className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900">
                      Unlock pending until{' '}
                      {tc.accessGrants[0].unlocksAt
                        ? new Date(tc.accessGrants[0].unlocksAt).toLocaleDateString()
                        : 'soon'}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirm('Remove this trusted contact?') && remove.mutate(tc.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && <ContactForm persons={persons} onClose={() => setCreating(false)} />}
    </div>
  );
}

function ContactForm({ persons, onClose }: { persons: Person[]; onClose: () => void }) {
  const create = useCreate('trusted-contacts', '/trusted-contacts');
  const [form, setForm] = useState({
    personId: persons[0]?.id ?? '',
    accessTier: 'EXECUTOR',
    triggerType: 'CHECK_IN_MISSED',
    waitingPeriodDays: 7,
    letterToContact: '',
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
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 font-serif text-xl text-navy-900">Add trusted contact</h2>

        <Field label="Person">
          <Select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Access level">
          <Select
            value={form.accessTier}
            onChange={(e) => setForm({ ...form, accessTier: e.target.value })}
          >
            {Object.entries(ACCESS_TIER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Trigger">
          <Select
            value={form.triggerType}
            onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
          >
            <option value="CHECK_IN_MISSED">Check-in missed (dead-man&apos;s switch)</option>
            <option value="DEATH_CERTIFIED">Death certificate verified</option>
            <option value="MANUAL_UNLOCK">I unlock manually</option>
            <option value="EMERGENCY_REQUESTED">They can request emergency unlock</option>
          </Select>
        </Field>

        <Field
          label="Waiting period (days)"
          hint="After the trigger, this much time must pass before access is granted. You can cancel during this period."
        >
          <Input
            type="number"
            min="0"
            max="60"
            value={form.waitingPeriodDays}
            onChange={(e) => setForm({ ...form, waitingPeriodDays: Number(e.target.value) })}
          />
        </Field>

        <Field
          label="Private letter to this contact (optional)"
          hint="Only visible to them after the waiting period ends."
        >
          <Textarea
            rows={4}
            value={form.letterToContact}
            onChange={(e) => setForm({ ...form, letterToContact: e.target.value })}
          />
        </Field>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Add contact'}
          </Button>
        </div>
      </div>
    </div>
  );
}
