'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { apiClient } from '@/lib/api-client';

interface Match {
  id: string;
  source: string;
  matchJson: Record<string, unknown>;
  summary: string | null;
  confidence: number;
  reportedValueCents: number | null;
  currency: string | null;
  reviewStatus: 'NEW' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED' | 'CLAIMED';
  deceasedRelativeId: string | null;
  createdAt: string;
}

interface Response {
  matches: Match[];
  summary: {
    total: number;
    confirmed: number;
    underReview: number;
    new: number;
    dismissed: number;
  } | null;
}

const REVIEW_LABELS: Record<Match['reviewStatus'], string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under review',
  CONFIRMED: 'Confirmed',
  DISMISSED: 'Not a match',
  CLAIMED: 'Claim filed',
};

const REVIEW_COLORS: Record<Match['reviewStatus'], string> = {
  NEW: 'bg-gold-100 text-gold-800',
  UNDER_REVIEW: 'bg-accent-100 text-accent-800',
  CONFIRMED: 'bg-sage-100 text-sage-800',
  DISMISSED: 'bg-ink-100 text-ink-500',
  CLAIMED: 'bg-navy-100 text-navy-800',
};

export default function SearchResultsPage() {
  const { data, isLoading, refetch } = useQuery<Response>({
    queryKey: ['search-matches'],
    queryFn: () => apiClient.get<Response>('/search/matches'),
  });
  const [enqueueBusy, setEnqueueBusy] = useState(false);

  const matches = data?.matches ?? [];
  const summary = data?.summary;

  async function runNow() {
    setEnqueueBusy(true);
    try {
      await apiClient.post('/search/enqueue', {});
      await refetch();
    } finally {
      setEnqueueBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Search results</h1>
          <p className="mt-1 max-w-2xl text-ink-500">
            Possible unclaimed assets we&apos;ve found searching public registries for you and
            your deceased relatives.
          </p>
        </div>
        <Button onClick={runNow} disabled={enqueueBusy}>
          {enqueueBusy ? 'Queuing…' : 'Run new search now'}
        </Button>
      </div>

      {summary && (
        <div className="mb-8 grid grid-cols-4 gap-4">
          <Stat label="Total matches" value={summary.total} />
          <Stat label="High confidence" value={summary.confirmed + summary.underReview} />
          <Stat label="New / needs review" value={summary.new} />
          <Stat label="Ruled out" value={summary.dismissed} />
        </div>
      )}

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && matches.length === 0 && (
        <EmptyState
          title="No matches yet"
          body="We run new searches every night. Add deceased relatives to expand the search — the more data you provide, the better the results."
          action={
            <div className="flex gap-3">
              <Button onClick={runNow} disabled={enqueueBusy}>
                Run a search now
              </Button>
            </div>
          }
        />
      )}

      {matches.length > 0 && (
        <div className="space-y-4">
          {matches.map((m) => (
            <Card key={m.id}>
              <CardHeader className="mb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {(m.matchJson.ownerFullName as string | undefined) ??
                      (m.matchJson.holder as string | undefined) ??
                      'Match'}
                  </CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${
                      REVIEW_COLORS[m.reviewStatus]
                    }`}
                  >
                    {REVIEW_LABELS[m.reviewStatus]}
                  </span>
                </div>
                <CardSubtitle>
                  {m.source} · confidence {(m.confidence * 100).toFixed(0)}%
                  {m.summary && ` · ${m.summary}`}
                </CardSubtitle>
              </CardHeader>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {(m.matchJson.holder as string | undefined) && (
                  <>
                    <dt className="text-ink-500">Holder</dt>
                    <dd className="text-navy-900">{m.matchJson.holder as string}</dd>
                  </>
                )}
                {(m.matchJson.city as string | undefined) && (
                  <>
                    <dt className="text-ink-500">Last known city</dt>
                    <dd className="text-navy-900">
                      {m.matchJson.city as string}
                      {m.matchJson.region ? `, ${m.matchJson.region as string}` : ''}
                    </dd>
                  </>
                )}
                {(m.matchJson.reportedValue as string | undefined) && (
                  <>
                    <dt className="text-ink-500">Reported value</dt>
                    <dd className="text-navy-900">{m.matchJson.reportedValue as string}</dd>
                  </>
                )}
                {(m.matchJson.detailUrl as string | undefined) && (
                  <>
                    <dt className="text-ink-500">Source</dt>
                    <dd>
                      <a
                        className="text-accent-700 underline"
                        href={m.matchJson.detailUrl as string}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on {m.source} →
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</div>
      <div className="mt-1 font-serif text-3xl text-navy-900">{value}</div>
    </div>
  );
}
