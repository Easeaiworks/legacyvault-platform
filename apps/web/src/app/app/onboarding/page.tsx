'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/card';
import { CATEGORY_LABELS, typesForCountry, type Country } from '@/lib/asset-types';

type Step = 'welcome' | 'first-asset' | 'first-contact' | 'done';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [country, setCountry] = useState<Country>('US');
  const [loading, setLoading] = useState(false);

  const [asset, setAsset] = useState({
    category: 'BANKING',
    type: 'CHECKING',
    nickname: '',
    institutionName: '',
    estimatedValueCents: '',
    currency: 'USD',
  });

  const [person, setPerson] = useState({
    firstName: '',
    lastName: '',
    relationship: 'SPOUSE',
    email: '',
  });

  async function saveAsset() {
    setLoading(true);
    try {
      await apiClient.post('/assets', {
        ...asset,
        estimatedValueCents: asset.estimatedValueCents
          ? BigInt(Math.round(Number(asset.estimatedValueCents) * 100)).toString()
          : null,
      });
      setStep('first-contact');
    } finally {
      setLoading(false);
    }
  }

  async function savePerson() {
    setLoading(true);
    try {
      await apiClient.post('/persons', person);
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Progress step={step} />

      {step === 'welcome' && (
        <Card>
          <CardTitle>Welcome to LegacyVault</CardTitle>
          <CardSubtitle>
            This takes about five minutes. We&apos;ll help you document one asset, add one trusted
            person, and set a check-in rhythm. You can always come back and add more.
          </CardSubtitle>
          <div className="mt-6">
            <Field label="Where do you live?" hint="We'll tailor asset types to your country.">
              <Select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </Select>
            </Field>
          </div>
          <Button onClick={() => setStep('first-asset')} size="lg">
            Let&apos;s begin
          </Button>
        </Card>
      )}

      {step === 'first-asset' && (
        <Card>
          <CardTitle>Document your first asset</CardTitle>
          <CardSubtitle>
            Start with something top-of-mind — your main checking account or your retirement plan.
            You can add more later.
          </CardSubtitle>
          <div className="mt-6 grid gap-4">
            <Field label="Category">
              <Select
                value={asset.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  const firstType = typesForCountry(cat, country)[0]?.value ?? 'OTHER_ASSET';
                  setAsset({ ...asset, category: cat, type: firstType });
                }}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={asset.type} onChange={(e) => setAsset({ ...asset, type: e.target.value })}>
                {typesForCountry(asset.category, country).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nickname" hint="Just a name you'll recognize, e.g. 'Primary Checking'">
              <Input
                value={asset.nickname}
                onChange={(e) => setAsset({ ...asset, nickname: e.target.value })}
                required
              />
            </Field>
            <Field label="Institution (optional)">
              <Input
                value={asset.institutionName}
                onChange={(e) => setAsset({ ...asset, institutionName: e.target.value })}
              />
            </Field>
            <Field label="Estimated value (optional)" hint="Rough is fine. This is for you.">
              <Input
                type="number"
                step="0.01"
                value={asset.estimatedValueCents}
                onChange={(e) => setAsset({ ...asset, estimatedValueCents: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => setStep('welcome')}>
              Back
            </Button>
            <Button disabled={!asset.nickname || loading} onClick={saveAsset}>
              {loading ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'first-contact' && (
        <Card>
          <CardTitle>Who should know about this?</CardTitle>
          <CardSubtitle>
            Add one trusted person — a spouse, adult child, or the executor you intend to name.
            You can configure what they can access later.
          </CardSubtitle>
          <div className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name">
                <Input
                  value={person.firstName}
                  onChange={(e) => setPerson({ ...person, firstName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={person.lastName}
                  onChange={(e) => setPerson({ ...person, lastName: e.target.value })}
                  required
                />
              </Field>
            </div>
            <Field label="Relationship">
              <Select
                value={person.relationship}
                onChange={(e) => setPerson({ ...person, relationship: e.target.value })}
              >
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="PARENT">Parent</option>
                <option value="SIBLING">Sibling</option>
                <option value="EXECUTOR">Executor</option>
                <option value="ATTORNEY">Attorney</option>
                <option value="FRIEND">Friend</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Email (optional)" hint="We'll use this to notify them if needed.">
              <Input
                type="email"
                value={person.email}
                onChange={(e) => setPerson({ ...person, email: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => setStep('first-asset')}>
              Back
            </Button>
            <Button
              disabled={!person.firstName || !person.lastName || loading}
              onClick={savePerson}
            >
              {loading ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <CardTitle>You&apos;re off to a great start.</CardTitle>
          <CardSubtitle>
            Your vault is live. From here you can add more assets, upload documents like your will,
            set beneficiaries, and configure your trusted-contact unlock rules.
          </CardSubtitle>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => router.push('/app/assets')}>Add another asset</Button>
            <Button variant="secondary" onClick={() => router.push('/app')}>
              Go to overview
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const steps: Step[] = ['welcome', 'first-asset', 'first-contact', 'done'];
  const idx = steps.indexOf(step);
  return (
    <div className="mb-8 flex gap-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-navy-700' : 'bg-ink-200'}`}
        />
      ))}
    </div>
  );
}
