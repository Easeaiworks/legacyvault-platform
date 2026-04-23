'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useList } from '@/lib/hooks';

interface Recipient {
  id: string;
  personId: string;
  person: { id: string; firstName: string; lastName: string };
}

interface Trigger {
  id: string;
  kind: string;
  releaseAt: string | null;
  ageYears: number | null;
  eventKind: string | null;
  daysAfterDeath: number | null;
}

interface Message {
  id: string;
  title: string;
  mediaType: 'AUDIO' | 'LETTER';
  status: 'DRAFT' | 'SEALED' | 'RELEASED' | 'REVOKED' | 'ARCHIVED';
  sealedAt: string | null;
  createdAt: string;
  recipients: Recipient[];
  triggers: Trigger[];
  prompt?: { id: string; category: string; title: string } | null;
}

type Filter = 'ALL' | 'DRAFT' | 'SEALED' | 'RELEASED';

export default function MessagesPage() {
  const { data: messages = [], isLoading } = useList<Message>('messages', '/messages');
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = messages.filter((m) => {
    if (filter === 'ALL') return m.status !== 'REVOKED';
    return m.status === filter;
  });

  const drafts = messages.filter((m) => m.status === 'DRAFT');
  const sealed = messages.filter((m) => m.status === 'SEALED');
  const released = messages.filter((m) => m.status === 'RELEASED');

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Messages</h1>
          <p className="mt-1 text-ink-500">
            Letters and recordings for the people you love, delivered when you want them to arrive.
          </p>
        </div>
        <Link href="/app/messages/new">
          <Button>Write a message</Button>
        </Link>
      </div>

      {/* Stats strip */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Stat label="Drafts" value={drafts.length} tone="neutral" />
        <Stat label="Scheduled to arrive" value={sealed.length} tone="accent" />
        <Stat label="Already delivered" value={released.length} tone="neutral" />
      </div>

      {/* Filter chips */}
      {messages.length > 0 && (
        <div className="mb-6 flex gap-2">
          {(['ALL', 'DRAFT', 'SEALED', 'RELEASED'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                filter === f
                  ? 'bg-navy-700 text-ink-50'
                  : 'border border-ink-300 text-navy-900 hover:bg-ink-100'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              <span className="ml-1.5 opacity-60">
                {f === 'ALL' ? messages.filter((m) => m.status !== 'REVOKED').length : messages.filter((m) => m.status === f).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && messages.length === 0 && (
        <EmptyState
          title="Nothing left for them yet"
          body="Start with a short letter to one person. You can come back and add more anytime — for a birthday, a graduation, or simply because."
          action={
            <Link href="/app/messages/new">
              <Button>Write your first message</Button>
            </Link>
          }
        />
      )}

      {!isLoading && filtered.length === 0 && messages.length > 0 && (
        <Card>
          <p className="text-center text-ink-500">Nothing in this view.</p>
        </Card>
      )}

      {filtered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {filter === 'ALL' ? 'All messages' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {filtered.map((m) => (
              <li key={m.id}>
                <MessageRow message={m} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'accent';
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        tone === 'accent' ? 'border-accent-300 bg-accent-50' : 'border-ink-200 bg-white'
      }`}
    >
      <div className="text-sm text-ink-500">{label}</div>
      <div className={`mt-1 font-serif text-3xl ${tone === 'accent' ? 'text-accent-900' : 'text-navy-900'}`}>
        {value}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  const recipients = message.recipients.map((r) => `${r.person.firstName} ${r.person.lastName}`);
  const trigger = message.triggers[0];
  const mediaTypeLabel = message.mediaType === 'AUDIO' ? 'Audio' : 'Letter';

  return (
    <Link
      href={`/app/messages/${message.id}`}
      className="flex items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-ink-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-navy-900">{message.title}</span>
          <StatusBadge status={message.status} />
          <span className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600">
            {mediaTypeLabel}
          </span>
        </div>
        <div className="mt-1 text-sm text-ink-500">
          {recipients.length > 0 ? `For ${formatList(recipients)}` : 'No recipients yet'}
          {trigger && <span> · {formatTrigger(trigger)}</span>}
        </div>
      </div>
      <div className="text-ink-300">→</div>
    </Link>
  );
}

function StatusBadge({ status }: { status: Message['status'] }) {
  const config: Record<Message['status'], { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-ink-100 text-ink-700' },
    SEALED: { label: 'Sealed', className: 'bg-accent-100 text-accent-800' },
    RELEASED: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
    REVOKED: { label: 'Revoked', className: 'bg-red-100 text-red-800' },
    ARCHIVED: { label: 'Archived', className: 'bg-ink-100 text-ink-500' },
  };
  const c = config[status] ?? { label: status, className: 'bg-ink-100 text-ink-700' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>
  );
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0] ?? ''} and ${items[1] ?? ''}`;
  const last = items[items.length - 1] ?? '';
  return `${items.slice(0, -1).join(', ')}, and ${last}`;
}

function formatTrigger(t: Trigger): string {
  switch (t.kind) {
    case 'TIME_ABSOLUTE':
      return t.releaseAt
        ? `on ${new Date(t.releaseAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
        : 'scheduled';
    case 'TIME_RELATIVE_TO_DOB':
      return t.ageYears != null ? `on their ${ordinal(t.ageYears)} birthday` : 'on a birthday';
    case 'LIFE_EVENT': {
      const events: Record<string, string> = {
        GRADUATION: 'when they graduate',
        MARRIAGE: 'when they get married',
        FIRST_CHILD: 'when they have their first child',
        DIVORCE: 'if they go through a divorce',
        JOB_LOSS: 'if they lose their job',
        DIAGNOSIS: 'in case of serious diagnosis',
        GRIEF_FIRST_YEAR: 'in their first year of grieving',
        CUSTOM: 'on a life event',
      };
      return t.eventKind ? (events[t.eventKind] ?? 'on a life event') : 'on a life event';
    }
    case 'DEATH_PLUS':
      return `${t.daysAfterDeath ?? 90} days after I'm gone`;
    default:
      return 'scheduled';
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'] as const;
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
  return `${n}${suffix}`;
}
