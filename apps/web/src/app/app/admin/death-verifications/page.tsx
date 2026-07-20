'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Textarea, Label } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'WITHDRAWN';

interface Verification {
  id: string;
  status: Status;
  principalName: string;
  principalCountry: string | null;
  submitterName: string;
  submitterEmail: string | null;
  supportingEvidence: string | null;
  submitterNotes: string | null;
  documentId: string | null;
  trustedContactCount: number;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED: 'Awaiting review',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_STYLES: Record<Status, string> = {
  SUBMITTED: 'bg-accent-100 text-accent-700',
  UNDER_REVIEW: 'bg-navy-100 text-navy-800',
  VERIFIED: 'bg-sage-100 text-sage-700',
  REJECTED: 'bg-terracotta-100 text-terracotta-700',
  WITHDRAWN: 'bg-ink-100 text-ink-700',
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'queue', label: 'Review queue' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function AdminDeathVerificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('queue');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const query = filter === 'queue' ? '' : `?status=${filter}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-death-verifications', filter],
    queryFn: () =>
      apiClient.get<{ verifications: Verification[] }>(`/admin/death-verifications${query}`),
  });

  const act = useMutation({
    mutationFn: ({
      id,
      action,
      reviewNotes,
    }: {
      id: string;
      action: 'start_review' | 'approve' | 'reject';
      reviewNotes?: string;
    }) => apiClient.patch(`/admin/death-verifications/${id}`, { action, reviewNotes }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-death-verifications'] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const forbidden = error instanceof Error && /403|Forbidden/i.test(error.message);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-navy-900">Death verifications</h1>
        <p className="mt-1 text-ink-500">
          Operations review queue. Approving a submission marks the account holder as verified
          deceased and starts each trusted contact&apos;s waiting period.
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'primary' : 'secondary'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-xl border border-terracotta-300 bg-terracotta-100 px-4 py-3 text-sm text-terracotta-700">
          {actionError}
        </div>
      )}

      {forbidden ? (
        <EmptyState
          title="Operations access required"
          body="This review queue is only available to LegacyVault platform staff. Your account doesn't have the required role."
        />
      ) : isLoading ? (
        <p className="text-ink-500">Loading…</p>
      ) : !data || data.verifications.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="No death-verification submissions in this view."
        />
      ) : (
        <div className="space-y-4">
          {data.verifications.map((v) => {
            const actionable = v.status === 'SUBMITTED' || v.status === 'UNDER_REVIEW';
            return (
              <Card key={v.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{v.principalName}</CardTitle>
                      <CardSubtitle>
                        Submitted by {v.submitterName}
                        {v.submitterEmail ? ` (${v.submitterEmail})` : ''} ·{' '}
                        {new Date(v.createdAt).toLocaleDateString()} · {v.trustedContactCount}{' '}
                        trusted contact{v.trustedContactCount === 1 ? '' : 's'} on file
                      </CardSubtitle>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[v.status]}`}
                    >
                      {STATUS_LABELS[v.status]}
                    </span>
                  </div>
                </CardHeader>

                <div className="space-y-3 text-sm">
                  {v.supportingEvidence && (
                    <p>
                      <span className="font-semibold text-ink-700">Supporting evidence:</span>{' '}
                      <a
                        href={v.supportingEvidence}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy-700 underline"
                      >
                        {v.supportingEvidence}
                      </a>
                    </p>
                  )}
                  {v.submitterNotes && (
                    <p>
                      <span className="font-semibold text-ink-700">Submitter notes:</span>{' '}
                      {v.submitterNotes}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold text-ink-700">Death certificate:</span>{' '}
                    {v.documentId ? 'uploaded' : 'not uploaded'}
                  </p>
                  {v.reviewNotes && (
                    <p>
                      <span className="font-semibold text-ink-700">Review notes:</span>{' '}
                      {v.reviewNotes}
                    </p>
                  )}

                  {actionable && (
                    <div className="space-y-3 border-t border-ink-100 pt-4">
                      <div>
                        <Label>Review notes (required to reject)</Label>
                        <Textarea
                          rows={2}
                          value={notesById[v.id] ?? ''}
                          onChange={(e) =>
                            setNotesById((prev) => ({ ...prev, [v.id]: e.target.value }))
                          }
                          placeholder="Verification details, document checks performed, reason if rejecting…"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {v.status === 'SUBMITTED' && (
                          <Button
                            variant="secondary"
                            disabled={act.isPending}
                            onClick={() => act.mutate({ id: v.id, action: 'start_review' })}
                          >
                            Start review
                          </Button>
                        )}
                        <Button
                          disabled={act.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Approve this death verification for ${v.principalName}? This starts the waiting period for ${v.trustedContactCount} trusted contact(s) and cannot be undone.`,
                              )
                            ) {
                              act.mutate({
                                id: v.id,
                                action: 'approve',
                                reviewNotes: notesById[v.id],
                              });
                            }
                          }}
                        >
                          Approve — verified deceased
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={act.isPending || !(notesById[v.id] ?? '').trim()}
                          onClick={() =>
                            act.mutate({ id: v.id, action: 'reject', reviewNotes: notesById[v.id] })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
