'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

interface Viewer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

interface CreateResponse {
  id: string;
  email: string;
  accessLink: string;
  expiresInDays: number;
}

export default function ViewersSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [issued, setIssued] = useState<CreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['viewers'],
    queryFn: () => apiClient.get<{ viewers: Viewer[] }>('/viewers'),
  });

  const create = useMutation({
    mutationFn: () => apiClient.post<CreateResponse>('/viewers', form),
    onSuccess: (res) => {
      setIssued(res);
      setCopied(false);
      setErrorMsg(null);
      setForm({ firstName: '', lastName: '', email: '' });
      void queryClient.invalidateQueries({ queryKey: ['viewers'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/viewers/${id}`),
    onSuccess: () => {
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['viewers'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const reissue = useMutation({
    mutationFn: (viewer: Viewer) =>
      apiClient.post<CreateResponse>('/viewers', {
        email: viewer.email,
        firstName: viewer.firstName ?? 'Viewer',
        lastName: viewer.lastName ?? 'Account',
      }),
    onSuccess: (res) => {
      setIssued(res);
      setCopied(false);
      setErrorMsg(null);
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-navy-900">Viewer access</h1>
        <p className="mt-1 text-ink-500">
          Give your executor, attorney, or a trusted family member read-only access to your
          vault. Viewers can see your documents and information but cannot change anything.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-terracotta-300 bg-terracotta-100 px-4 py-3 text-sm text-terracotta-700">
          {errorMsg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a viewer</CardTitle>
          <CardSubtitle>
            An access link is generated for you to share with them directly. Links work for 7
            days — you can issue a fresh one here any time.
          </CardSubtitle>
        </CardHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>First name</Label>
              <Input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Last name</Label>
              <Input
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create view-only access'}
          </Button>
        </form>

        {issued && (
          <div className="mt-6 rounded-xl border border-sage-300 bg-sage-100 p-4">
            <p className="text-sm font-semibold text-sage-700">
              Access link for {issued.email} — valid {issued.expiresInDays} days
            </p>
            <p className="mt-2 break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-ink-700">
              {issued.accessLink}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(issued.accessLink).then(() => setCopied(true));
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <span className="text-xs text-ink-500">
                Share it directly with them — treat it like a key.
              </span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current viewers</CardTitle>
        </CardHeader>
        {isLoading ? (
          <p className="text-ink-500">Loading…</p>
        ) : !data || data.viewers.length === 0 ? (
          <EmptyState
            title="No viewers yet"
            body="No one currently has view-only access to your vault."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.viewers.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-navy-900">
                    {[v.firstName, v.lastName].filter(Boolean).join(' ') || v.email}
                  </p>
                  <p className="text-sm text-ink-500">
                    {v.email} · added {new Date(v.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reissue.isPending}
                    onClick={() => reissue.mutate(v)}
                  >
                    New link
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Revoke view-only access for ${v.email}? Their account is removed immediately.`,
                        )
                      ) {
                        revoke.mutate(v.id);
                      }
                    }}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
