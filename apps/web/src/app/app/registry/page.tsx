'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, Field } from '@/components/ui/input';
import { useList } from '@/lib/hooks';
import { apiClient } from '@/lib/api-client';
import { PendingReviewBadge } from '@/components/pending-review-badge';

interface RegistryStatus {
  status: 'no-principal' | 'not-opted-in' | 'active' | 'opted-out';
  entry: null | {
    id: string;
    identityVerifiedAt: string | null;
    identityProvider: string | null;
    visibility: string;
    optedInAt: string;
  };
}

export default function RegistryPage() {
  const qc = useQueryClient();
  const { data: status } = useList<RegistryStatus>('registry-status', '/registry/me');
  const [visibility, setVisibility] = useState('INSTITUTIONS_VERIFIED_ONLY');
  const [saving, setSaving] = useState(false);

  const me = (status as unknown as RegistryStatus) ?? {
    status: 'not-opted-in' as const,
    entry: null,
  };

  async function optIn() {
    setSaving(true);
    try {
      await apiClient.post('/registry/me/opt-in', {
        consentAcknowledged: true,
        visibility,
      });
      await qc.invalidateQueries({ queryKey: ['registry-status'] });
    } finally {
      setSaving(false);
    }
  }

  async function updateVisibility(v: string) {
    await apiClient.patch('/registry/me', { visibility: v });
    await qc.invalidateQueries({ queryKey: ['registry-status'] });
  }

  async function optOut() {
    if (!confirm('Opt out of the registry? This is logged permanently for audit.')) return;
    await apiClient.delete('/registry/me');
    await qc.invalidateQueries({ queryKey: ['registry-status'] });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-navy-900">Registry</h1>
        <p className="mt-1 text-ink-500">
          Your opt-in &quot;findable&quot; layer. Free, identity-verified, and fully under your
          control.
        </p>
      </div>

      {me.status === 'active' && me.entry && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your registry status</CardTitle>
            </CardHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <Stat label="Enrolled since" value={new Date(me.entry.optedInAt).toLocaleDateString()} />
              <Stat
                label="Identity verified"
                value={me.entry.identityVerifiedAt ? 'Yes' : 'Pending verification'}
              />
              <Stat label="Current visibility" value={humanizeVis(me.entry.visibility)} />
              <Stat label="Queries logged" value="—" hint="None yet" />
            </div>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Who can find you</CardTitle>
            </CardHeader>
            <Field label="Visibility">
              <Select
                defaultValue={me.entry.visibility}
                onChange={(e) => updateVisibility(e.target.value)}
              >
                <option value="INSTITUTIONS_VERIFIED_ONLY">
                  Verified institutions only (recommended)
                </option>
                <option value="ATTORNEYS_AND_INSTITUTIONS">
                  Verified institutions + estate attorneys
                </option>
                <option value="FAMILY_WITH_VERIFICATION">
                  Family members, with verification of relationship
                </option>
                <option value="PRIVATE">Private — registered but not discoverable</option>
              </Select>
            </Field>
            <p className="text-sm text-ink-500">
              Any change takes effect immediately and is logged in your audit trail.
            </p>
          </Card>

          <PendingReviewBadge className="mb-6">
            Forward-looking value: once counsel approves, you&apos;ll be notified here when a
            verified institution or estate attorney searches for a record matching you. No such
            queries are occurring today. This feature is shown to illustrate the full product
            design for legal review.
          </PendingReviewBadge>

          <Card>
            <CardHeader>
              <CardTitle>Opt out</CardTitle>
            </CardHeader>
            <p className="mb-4 text-ink-700">
              You can leave the registry at any time. Your record is permanently marked as
              opted-out; we retain the audit trail of the original consent and withdrawal for
              compliance reasons, but you become immediately undiscoverable.
            </p>
            <Button variant="danger" onClick={optOut}>
              Opt out of the registry
            </Button>
          </Card>
        </>
      )}

      {me.status === 'not-opted-in' && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re not currently in the registry</CardTitle>
          </CardHeader>
          <p className="mb-4 text-ink-700">
            Enroll for free. You control visibility, you&apos;re notified of every query against
            you, and you can opt out permanently at any time.
          </p>
          <Field label="Default visibility">
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="INSTITUTIONS_VERIFIED_ONLY">Verified institutions only</option>
              <option value="ATTORNEYS_AND_INSTITUTIONS">Institutions + attorneys</option>
              <option value="FAMILY_WITH_VERIFICATION">Family, with verification</option>
              <option value="PRIVATE">Private</option>
            </Select>
          </Field>
          <Button onClick={optIn} disabled={saving}>
            {saving ? 'Enrolling…' : 'Opt in to the registry'}
          </Button>
        </Card>
      )}

      {me.status === 'opted-out' && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;ve opted out</CardTitle>
          </CardHeader>
          <p className="text-ink-700">
            Your previous enrollment is marked as permanently withdrawn. If you change your mind,
            you can opt back in below — a fresh enrollment is created in the audit log.
          </p>
          <div className="mt-4">
            <Button onClick={optIn} disabled={saving}>
              Re-enroll
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-500">{label}</div>
      <div className="mt-1 font-serif text-xl text-navy-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

function humanizeVis(v: string) {
  return (
    {
      INSTITUTIONS_VERIFIED_ONLY: 'Verified institutions only',
      ATTORNEYS_AND_INSTITUTIONS: 'Institutions + attorneys',
      FAMILY_WITH_VERIFICATION: 'Family, with verification',
      PRIVATE: 'Private',
    }[v] ?? v
  );
}
