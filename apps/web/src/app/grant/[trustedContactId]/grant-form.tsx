'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Field } from '@/components/ui/input';

interface Props {
  trustedContactId: string;
  contactEmailHint: string;
}

export function GrantForm({ trustedContactId, contactEmailHint }: Props) {
  const [email, setEmail] = useState(contactEmailHint);
  const [evidence, setEvidence] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string; message: string } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/death-verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trustedContactId,
          submitterEmail: email,
          supportingEvidence: evidence || undefined,
          submitterNotes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({ error: 'Submission failed' }))) as {
          error?: string;
        };
        throw new Error(j.error ?? 'Submission failed');
      }
      const data = (await res.json()) as { id: string; message: string };
      setSubmitted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-md border border-sage-300 bg-sage-100/40 p-6 text-sm text-sage-800">
        <div className="mb-2 font-serif text-lg text-navy-900">Submission received</div>
        <p>{submitted.message}</p>
        <p className="mt-3 text-xs text-ink-500">Reference: {submitted.id}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <Field
        label="Your email"
        hint="Must match the email on file for you as a trusted contact."
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Supporting evidence (URL to obituary, funeral notice, etc.)"
        hint="Optional. Helps us verify faster."
      >
        <Input
          type="url"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="https://..."
        />
      </Field>

      <Field
        label="Additional context (optional)"
        hint="Funeral home contact info, executor name, or anything else useful."
      >
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="rounded-md border border-terracotta-300 bg-terracotta-100/40 p-4 text-xs text-terracotta-800">
        Death-certificate upload is handled in a follow-up email — after you submit this form, we
        will email you a secure upload link. Never send certificates via unsecured channels.
      </div>

      {error && <div className="text-sm text-red-700">{error}</div>}

      <Button onClick={submit} disabled={busy || !email}>
        {busy ? 'Submitting…' : 'Submit'}
      </Button>
    </div>
  );
}
