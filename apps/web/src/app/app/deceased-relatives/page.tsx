'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import { useList, useCreate, useRemove } from '@/lib/hooks';

// Relationships that make sense for a *deceased* relative (ancestors + peers).
const DECEASED_RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  GRANDPARENT: 'Grandparent',
  GREAT_GRANDPARENT: 'Great-grandparent',
  AUNT_UNCLE: 'Aunt or uncle',
  COUSIN: 'Cousin',
  SIBLING: 'Sibling',
  SPOUSE: 'Spouse (predeceased)',
  OTHER: 'Other',
};

interface DeceasedRelative {
  id: string;
  legalFirstName: string;
  legalMiddleName: string | null;
  legalLastName: string;
  priorNames: string[];
  relationship: string;
  dateOfBirth: string | null;
  dateOfDeath: string | null;
  lastKnownCity: string | null;
  lastKnownRegion: string | null;
  lastKnownCountry: string | null;
  govIdCountry: string | null;
  govIdLast4: string | null;
  militaryService: boolean;
  deathCertificateAvailable: boolean;
}

export default function DeceasedRelativesPage() {
  const { data: relatives = [], isLoading } = useList<DeceasedRelative>(
    'deceased-relatives',
    '/deceased-relatives',
  );
  const remove = useRemove('deceased-relatives', '/deceased-relatives');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Deceased relatives</h1>
          <p className="mt-1 max-w-2xl text-ink-500">
            The relatives you&apos;ve lost — parents, grandparents, aunts and uncles. We use these
            records to search for unclaimed assets, forgotten pensions, and death benefits that
            may still be owed to you. Every field you add makes the search more accurate.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Add a relative</Button>
      </div>

      <Card className="mb-8 border-accent-300 bg-accent-100/40 p-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-700">
          How this works
        </div>
        <p className="text-sm text-ink-700">
          Once a quarter we run your list against public unclaimed-property registries in the US
          and Canada (Bank of Canada, MissingMoney.com, provincial escheat databases, PBGC).
          You&apos;ll receive a report of any matches. We never share your data with anyone.
        </p>
      </Card>

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && relatives.length === 0 && (
        <EmptyState
          title="No relatives added yet"
          body="Start with a parent or grandparent. Even partial information helps — name and approximate year of death is enough to begin a search."
          action={<Button onClick={() => setCreating(true)}>Add someone</Button>}
        />
      )}

      {relatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your relatives</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-200">
            {relatives.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-navy-900">
                      {r.legalFirstName}
                      {r.legalMiddleName ? ` ${r.legalMiddleName}` : ''} {r.legalLastName}
                      {Array.isArray(r.priorNames) && r.priorNames.length > 0 && (
                        <span className="ml-2 text-ink-500">
                          (also: {r.priorNames.join(', ')})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-ink-500">
                      {DECEASED_RELATIONSHIP_LABELS[r.relationship] ?? r.relationship}
                      {r.dateOfDeath && ` · died ${formatDate(r.dateOfDeath)}`}
                      {r.lastKnownRegion &&
                        ` · last known: ${r.lastKnownCity ?? ''} ${r.lastKnownRegion}`}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-500">
                      {r.govIdLast4 && (
                        <span className="rounded bg-ink-100 px-2 py-0.5">
                          {r.govIdCountry === 'CA' ? 'SIN' : 'SSN'} ····{r.govIdLast4}
                        </span>
                      )}
                      {r.militaryService && (
                        <span className="rounded bg-ink-100 px-2 py-0.5">Military service</span>
                      )}
                      {r.deathCertificateAvailable && (
                        <span className="rounded bg-sage-100 px-2 py-0.5 text-sage-700">
                          Death certificate on file
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      confirm(`Remove ${r.legalFirstName} ${r.legalLastName}?`) &&
                      remove.mutate(r.id)
                    }
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && <RelativeForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function RelativeForm({ onClose }: { onClose: () => void }) {
  const create = useCreate('deceased-relatives', '/deceased-relatives');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    legalFirstName: '',
    legalMiddleName: '',
    legalLastName: '',
    priorNamesRaw: '',
    relationship: 'PARENT',
    dateOfBirth: '',
    dateOfDeath: '',
    birthCity: '',
    birthCountry: '',
    lastKnownCity: '',
    lastKnownRegion: '',
    lastKnownCountry: 'US',
    employersRaw: '',
    financialInstitutionsRaw: '',
    govIdCountry: '',
    govIdLast4: '',
    govIdFull: '',
    militaryService: false,
    deathCertificateAvailable: false,
    notes: '',
  });

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const priorNames = form.priorNamesRaw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    const employers = form.employersRaw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    const financialInstitutions = form.financialInstitutionsRaw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    await create.mutateAsync({
      legalFirstName: form.legalFirstName,
      legalMiddleName: form.legalMiddleName || undefined,
      legalLastName: form.legalLastName,
      priorNames,
      relationship: form.relationship,
      dateOfBirth: form.dateOfBirth || undefined,
      dateOfDeath: form.dateOfDeath || undefined,
      birthCity: form.birthCity || undefined,
      birthCountry: form.birthCountry || undefined,
      lastKnownCity: form.lastKnownCity || undefined,
      lastKnownRegion: form.lastKnownRegion || undefined,
      lastKnownCountry: form.lastKnownCountry || undefined,
      employers,
      financialInstitutions,
      govIdCountry: form.govIdCountry || undefined,
      govIdLast4: form.govIdLast4 || undefined,
      govIdFull: form.govIdFull || undefined,
      militaryService: form.militaryService,
      deathCertificateAvailable: form.deathCertificateAvailable,
      notes: form.notes || undefined,
    } as never);
    onClose();
  }

  const canAdvance = step === 1 ? form.legalFirstName && form.legalLastName : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl text-navy-900">Add a deceased relative</h2>
          <div className="text-xs text-ink-500">Step {step} of 3</div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="First name">
                <Input
                  value={form.legalFirstName}
                  onChange={(e) => updateField('legalFirstName', e.target.value)}
                />
              </Field>
              <Field label="Middle name (optional)">
                <Input
                  value={form.legalMiddleName}
                  onChange={(e) => updateField('legalMiddleName', e.target.value)}
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={form.legalLastName}
                  onChange={(e) => updateField('legalLastName', e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Prior names / maiden name (optional)"
              hint="Comma-separated. Critical for finding accounts opened under a former name."
            >
              <Input
                value={form.priorNamesRaw}
                onChange={(e) => updateField('priorNamesRaw', e.target.value)}
                placeholder="e.g. Smith, Johnson"
              />
            </Field>

            <Field label="Relationship to you">
              <Select
                value={form.relationship}
                onChange={(e) => updateField('relationship', e.target.value)}
              >
                {Object.entries(DECEASED_RELATIONSHIP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of birth (optional)">
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                />
              </Field>
              <Field label="Date of death (optional)">
                <Input
                  type="date"
                  value={form.dateOfDeath}
                  onChange={(e) => updateField('dateOfDeath', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-ink-500">
              Locations help match records across cities and provinces. Employer and bank names
              feed the search directly.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Birth city (optional)">
                <Input
                  value={form.birthCity}
                  onChange={(e) => updateField('birthCity', e.target.value)}
                />
              </Field>
              <Field label="Birth country (optional)" hint="Two-letter code (US, CA, UK…)">
                <Input
                  maxLength={2}
                  value={form.birthCountry}
                  onChange={(e) => updateField('birthCountry', e.target.value.toUpperCase())}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Last known city">
                <Input
                  value={form.lastKnownCity}
                  onChange={(e) => updateField('lastKnownCity', e.target.value)}
                />
              </Field>
              <Field label="Province / state">
                <Input
                  maxLength={8}
                  value={form.lastKnownRegion}
                  onChange={(e) => updateField('lastKnownRegion', e.target.value.toUpperCase())}
                  placeholder="ON / CA"
                />
              </Field>
              <Field label="Country">
                <Select
                  value={form.lastKnownCountry}
                  onChange={(e) => updateField('lastKnownCountry', e.target.value)}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="">Other</option>
                </Select>
              </Field>
            </div>

            <Field
              label="Employers (optional, comma-separated)"
              hint="Companies they worked for. Powers pension and 401(k) escheat lookups."
            >
              <Textarea
                rows={2}
                value={form.employersRaw}
                onChange={(e) => updateField('employersRaw', e.target.value)}
                placeholder="Canadian National Railway, Ford Motor Company"
              />
            </Field>

            <Field
              label="Financial institutions (optional, comma-separated)"
              hint="Banks, credit unions, brokerages. We search for dormant accounts at each."
            >
              <Textarea
                rows={2}
                value={form.financialInstitutionsRaw}
                onChange={(e) => updateField('financialInstitutionsRaw', e.target.value)}
                placeholder="Royal Bank of Canada, Fidelity, Sun Life"
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-ink-500">
              Optional identifiers dramatically improve match accuracy. Full SSN/SIN is encrypted
              at rest and only decrypted at the moment we query the SSA Death Master File or
              equivalent Canadian registries.
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="ID country">
                <Select
                  value={form.govIdCountry}
                  onChange={(e) => updateField('govIdCountry', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="US">US (SSN)</option>
                  <option value="CA">Canada (SIN)</option>
                </Select>
              </Field>
              <Field label="Last 4 digits">
                <Input
                  maxLength={4}
                  value={form.govIdLast4}
                  onChange={(e) => updateField('govIdLast4', e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                />
              </Field>
              <Field label="Full ID (optional, encrypted)" hint="9 digits, no dashes.">
                <Input
                  type="password"
                  maxLength={11}
                  value={form.govIdFull}
                  onChange={(e) => updateField('govIdFull', e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.militaryService}
                  onChange={(e) => updateField('militaryService', e.target.checked)}
                />
                Served in the armed forces (VA / Veterans Affairs Canada lookups)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.deathCertificateAvailable}
                  onChange={(e) =>
                    updateField('deathCertificateAvailable', e.target.checked)
                  }
                />
                I have a copy of the death certificate (needed for most claims)
              </label>
            </div>

            <Field label="Notes (optional)">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Anything else that might help — professional associations, hobbies with membership dues, real estate held in other jurisdictions."
              />
            </Field>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canAdvance}>
                Continue
              </Button>
            ) : (
              <Button
                onClick={save}
                disabled={!form.legalFirstName || !form.legalLastName || create.isPending}
              >
                {create.isPending ? 'Saving…' : 'Add relative'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
