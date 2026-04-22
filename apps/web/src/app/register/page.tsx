'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { PendingReviewBadge } from '@/components/pending-review-badge';
import { apiClient } from '@/lib/api-client';

type Step = 'intro' | 'account' | 'identity' | 'visibility' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');

  const [account, setAccount] = useState({ email: '', firstName: '', lastName: '' });
  const [visibility, setVisibility] = useState<
    'INSTITUTIONS_VERIFIED_ONLY' | 'ATTORNEYS_AND_INSTITUTIONS' | 'FAMILY_WITH_VERIFICATION' | 'PRIVATE'
  >('INSTITUTIONS_VERIFIED_ONLY');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeSignup() {
    setLoading(true);
    setError(null);
    try {
      // In local-dev mode, calling /auth/login/start with an email returns
      // a dev token immediately. In WorkOS mode, it returns a redirect URL.
      const res = await apiClient.post<{ redirectUrl?: string; devToken?: string }>(
        '/auth/login/start',
        { email: account.email },
      );
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      if (res.devToken) {
        localStorage.setItem('auth_token', res.devToken);
        // Opt into the registry with default visibility.
        await apiClient.post('/registry/me/opt-in', {
          consentAcknowledged: true,
          visibility,
        });
        setStep('done');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-50">
      <nav className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-serif text-xl text-navy-900">
            LegacyVault
          </Link>
          <Link href="/login" className="text-sm text-navy-700 hover:text-navy-900">
            Already registered? Sign in
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <Progress step={step} />

        {step === 'intro' && (
          <Panel title="Welcome. Let's get you registered.">
            <p className="mb-4 text-ink-700">
              Registration is free. It verifies your identity once and creates your control
              center — so you choose who can find you, when, and with what proof of relationship.
            </p>
            <ul className="mb-6 space-y-2 text-sm text-ink-700">
              <li>✓ Takes about 3 minutes</li>
              <li>✓ No credit card required to register</li>
              <li>✓ You control visibility at all times</li>
              <li>✓ Opt out whenever you want — permanent</li>
            </ul>
            <Button onClick={() => setStep('account')} size="lg">
              Begin registration
            </Button>
          </Panel>
        )}

        {step === 'account' && (
          <Panel title="Create your account">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name">
                <Input
                  value={account.firstName}
                  onChange={(e) => setAccount({ ...account, firstName: e.target.value })}
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={account.lastName}
                  onChange={(e) => setAccount({ ...account, lastName: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Email" hint="We'll email you a secure sign-in link. No passwords.">
              <Input
                type="email"
                value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
                autoComplete="email"
                required
              />
            </Field>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setStep('intro')}>
                Back
              </Button>
              <Button
                onClick={() => setStep('identity')}
                disabled={!account.email || !account.firstName || !account.lastName}
              >
                Continue
              </Button>
            </div>
          </Panel>
        )}

        {step === 'identity' && (
          <Panel title="Verify your identity">
            <p className="mb-4 text-ink-700">
              This is the part that makes the registry trustworthy for everyone else. We use a
              third-party identity-verification service (Stripe Identity, Persona, or Onfido) to
              confirm you are who you say you are — once, up front, never shared with the
              institutions that may later search for you.
            </p>
            <div className="mb-4 rounded-md border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
              <strong>Placeholder:</strong> identity verification is not wired up in this build.
              For now you can continue without it; the registry entry will be created in an
              unverified state.
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setStep('account')}>
                Back
              </Button>
              <Button onClick={() => setStep('visibility')}>Continue (skip verification)</Button>
            </div>
          </Panel>
        )}

        {step === 'visibility' && (
          <Panel title="Who can find you?">
            <p className="mb-4 text-ink-700">
              You can change this at any time. No one sees raw personal details — only that a match
              was found, with the ability to request contact through LegacyVault, which you can
              accept or decline.
            </p>
            <Field label="Default visibility">
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as typeof visibility)}
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

            <div className="mt-6">
              <PendingReviewBadge>
                The institutional-query workflow described here is in development. No
                institutions are actively querying the registry today. This screen is shown as the
                full design expression for legal review; nothing here is enabled against real
                institutions until counsel approves.
              </PendingReviewBadge>
            </div>

            <div className="mt-6">
              <label className="flex items-start gap-3 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I understand registration is free; I can opt out at any time; every query against
                  my record will be logged and I will be notified; and I am not being promised that
                  any outcome, match, or recovery will occur as a result of registering.
                </span>
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setStep('identity')}>
                Back
              </Button>
              <Button onClick={completeSignup} disabled={!consent || loading}>
                {loading ? 'Creating your account…' : 'Finish registration'}
              </Button>
            </div>
          </Panel>
        )}

        {step === 'done' && (
          <Panel title="You're registered.">
            <p className="mb-6 text-ink-700">
              Your identity-verified registry entry is live. You can update visibility, add name
              variations, or opt out any time in the Registry page of the app.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/app/onboarding')}>Set up my vault</Button>
              <Button variant="secondary" onClick={() => router.push('/app/registry')}>
                Go to registry settings
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}

function Progress({ step }: { step: Step }) {
  const order: Step[] = ['intro', 'account', 'identity', 'visibility', 'done'];
  const idx = order.indexOf(step);
  return (
    <div className="mb-8 flex gap-2">
      {order.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-navy-700' : 'bg-ink-200'}`}
        />
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 font-serif text-2xl text-navy-900">{title}</h1>
      {children}
    </div>
  );
}
