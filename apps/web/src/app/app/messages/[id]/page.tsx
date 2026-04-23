'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useOne } from '@/lib/hooks';

interface MessageDetail {
  id: string;
  title: string;
  mediaType: 'AUDIO' | 'LETTER';
  status: 'DRAFT' | 'SEALED' | 'RELEASED' | 'REVOKED' | 'ARCHIVED';
  bodyEncrypted: string | null;
  sealedAt: string | null;
  createdAt: string;
  recipients: Array<{
    id: string;
    personId: string;
    person: { id: string; firstName: string; lastName: string };
    deliveredAt: string | null;
    viewedAt: string | null;
  }>;
  triggers: Array<{
    id: string;
    kind: string;
    releaseAt: string | null;
    ageYears: number | null;
    eventKind: string | null;
    daysAfterDeath: number | null;
  }>;
  prompt?: { id: string; category: string; title: string } | null;
}

export default function MessageDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data, isLoading, refetch } = useOne<MessageDetail>('messages', '/messages', id);

  async function revoke() {
    if (!data) return;
    if (!confirm(`Revoke "${data.title}"? Recipients won't receive it.`)) return;
    await apiClient.delete(`/messages/${id}`);
    router.push('/app/messages');
  }

  async function deleteDraft() {
    if (!data) return;
    if (!confirm(`Delete draft "${data.title}"? This can't be undone.`)) return;
    await apiClient.delete(`/messages/${id}`);
    router.push('/app/messages');
  }

  if (isLoading) return <div className="text-ink-500">Loading…</div>;
  if (!data) return <div className="text-ink-500">Not found.</div>;

  const trigger = data.triggers[0];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/messages" className="text-sm text-navy-700 hover:text-navy-900">
        ← Back to messages
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600">
              {data.mediaType === 'AUDIO' ? 'Audio' : 'Letter'}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-3xl text-navy-900">{data.title}</h1>
        </div>
        <div className="flex gap-2">
          {data.status === 'DRAFT' && (
            <>
              <Link href={`/app/messages/new`}>
                <Button variant="secondary">Continue editing</Button>
              </Link>
              <Button variant="ghost" onClick={deleteDraft}>
                Delete draft
              </Button>
            </>
          )}
          {data.status === 'SEALED' && (
            <Button variant="ghost" onClick={revoke}>
              Revoke
            </Button>
          )}
        </div>
      </div>

      {/* Recipients & trigger summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
        </CardHeader>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink-500">For</dt>
            <dd className="mt-1 text-navy-900">
              {data.recipients.length === 0
                ? '—'
                : data.recipients
                    .map((r) => `${r.person.firstName} ${r.person.lastName}`)
                    .join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink-500">When</dt>
            <dd className="mt-1 text-navy-900">{trigger ? formatTrigger(trigger) : '—'}</dd>
          </div>
          {data.sealedAt && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-500">Sealed</dt>
              <dd className="mt-1 text-navy-900">{new Date(data.sealedAt).toLocaleString()}</dd>
            </div>
          )}
          {data.prompt && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-500">Prompt</dt>
              <dd className="mt-1 text-navy-900">{data.prompt.title}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Content preview */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        {data.mediaType === 'LETTER' ? (
          data.bodyEncrypted ? (
            <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-navy-900">
              {data.bodyEncrypted}
            </div>
          ) : (
            <div className="text-ink-500">Nothing written yet.</div>
          )
        ) : (
          <div className="rounded-md bg-ink-50 p-6 text-center text-ink-500">
            Audio recording will appear here. (Recording UX ships with Phase 2.)
          </div>
        )}
      </Card>

      {/* Delivery status when released */}
      {data.status === 'RELEASED' && data.recipients.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recipient status</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {data.recipients.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div className="text-navy-900">
                  {r.person.firstName} {r.person.lastName}
                </div>
                <div className="text-sm text-ink-500">
                  {r.viewedAt
                    ? `Viewed ${new Date(r.viewedAt).toLocaleDateString()}`
                    : r.deliveredAt
                      ? `Delivered ${new Date(r.deliveredAt).toLocaleDateString()}`
                      : 'Pending'}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MessageDetail['status'] }) {
  const config: Record<MessageDetail['status'], { label: string; className: string }> = {
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

function formatTrigger(t: {
  kind: string;
  releaseAt: string | null;
  ageYears: number | null;
  eventKind: string | null;
  daysAfterDeath: number | null;
}): string {
  switch (t.kind) {
    case 'TIME_ABSOLUTE':
      return t.releaseAt
        ? new Date(t.releaseAt).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'scheduled';
    case 'TIME_RELATIVE_TO_DOB':
      return t.ageYears != null ? `On their ${t.ageYears}${suffix(t.ageYears)} birthday` : 'a birthday';
    case 'LIFE_EVENT': {
      const events: Record<string, string> = {
        GRADUATION: 'When they graduate',
        MARRIAGE: 'When they get married',
        FIRST_CHILD: 'When they have their first child',
        DIVORCE: 'If they go through a divorce',
        JOB_LOSS: 'If they lose their job',
        DIAGNOSIS: 'In case of a serious diagnosis',
        GRIEF_FIRST_YEAR: 'In their first year of grieving',
        CUSTOM: 'On a life event',
      };
      return t.eventKind ? (events[t.eventKind] ?? 'on a life event') : 'on a life event';
    }
    case 'DEATH_PLUS':
      return `${t.daysAfterDeath ?? 90} days after my verified passing`;
    default:
      return 'scheduled';
  }
}

function suffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'] as const;
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
}
