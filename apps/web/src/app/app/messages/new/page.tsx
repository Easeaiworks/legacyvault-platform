'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useList } from '@/lib/hooks';

// ---- types --------------------------------------------------------------
interface Prompt {
  id: string;
  category: string;
  title: string;
  body: string;
  isSystem: boolean;
}
interface Person {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
}
interface MessageResource {
  id: string;
  title: string;
  mediaType: 'AUDIO' | 'LETTER';
  status: string;
}

type Mode = 'LETTER' | 'AUDIO';

type Step = 'PROMPT' | 'MODE' | 'WRITE' | 'RECIPIENTS' | 'TRIGGER' | 'REVIEW';

const STEP_ORDER: Step[] = ['PROMPT', 'MODE', 'WRITE', 'RECIPIENTS', 'TRIGGER', 'REVIEW'];

const CATEGORY_LABELS: Record<string, string> = {
  STORY: 'Stories',
  VALUES: 'What you believe',
  APOLOGY: 'Things left unsaid',
  MILESTONE: 'Milestones',
  RECIPE_STORY: 'Recipes & traditions',
  HEIRLOOM: 'Objects & heirlooms',
  FUNERAL: 'Funeral & memorial',
};

// ---- page ---------------------------------------------------------------
export default function NewMessagePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('PROMPT');
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [mode, setMode] = useState<Mode>('LETTER');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pickedPersonIds, setPickedPersonIds] = useState<string[]>([]);
  const [trigger, setTrigger] = useState<TriggerState>({ kind: 'TIME_ABSOLUTE', releaseAt: '' });
  const [messageId, setMessageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  function next() {
    const i = STEP_ORDER.indexOf(step);
    const nextStep = STEP_ORDER[i + 1];
    if (nextStep) setStep(nextStep);
  }
  function back() {
    const i = STEP_ORDER.indexOf(step);
    const prevStep = STEP_ORDER[i - 1];
    if (prevStep) setStep(prevStep);
  }

  async function ensureDraft(): Promise<string> {
    if (messageId) return messageId;
    const finalTitle = title.trim() || 'Untitled message';
    const created = await apiClient.post<MessageResource>('/messages', {
      title: finalTitle,
      mediaType: mode,
      promptId: prompt?.id ?? null,
    });
    setMessageId(created.id);
    return created.id;
  }

  async function saveBodyAndAdvance() {
    try {
      setSaving(true);
      setError(null);
      const id = await ensureDraft();
      await apiClient.patch(`/messages/${id}`, {
        bodyEncrypted: body, // Phase 1: plaintext stored in body_encrypted column (placeholder).
        // Phase 2 will add real client-side encryption here.
      });
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipientsAndAdvance() {
    try {
      setSaving(true);
      setError(null);
      const id = await ensureDraft();
      // Naive full-replace: remove all then add picked. Fine for MVP.
      const current = await apiClient.get<MessageResource & { recipients: { personId: string }[] }>(
        `/messages/${id}`,
      );
      for (const r of current.recipients) {
        if (!pickedPersonIds.includes(r.personId)) {
          await apiClient.delete(`/messages/${id}/recipients/${r.personId}`);
        }
      }
      for (const pid of pickedPersonIds) {
        if (!current.recipients.find((r) => r.personId === pid)) {
          await apiClient.post(`/messages/${id}/recipients`, { personId: pid });
        }
      }
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveTriggerAndAdvance() {
    try {
      setSaving(true);
      setError(null);
      const id = await ensureDraft();
      const payload: Record<string, unknown> = { kind: trigger.kind };
      if (trigger.kind === 'TIME_ABSOLUTE') {
        if (!trigger.releaseAt) throw new Error('Pick a date');
        payload.releaseAt = new Date(trigger.releaseAt).toISOString();
      }
      if (trigger.kind === 'TIME_RELATIVE_TO_DOB') {
        if (trigger.ageYears == null) throw new Error('Pick an age');
        payload.ageYears = trigger.ageYears;
      }
      if (trigger.kind === 'LIFE_EVENT') {
        if (!trigger.eventKind) throw new Error('Pick an event');
        payload.eventKind = trigger.eventKind;
      }
      if (trigger.kind === 'DEATH_PLUS') {
        payload.daysAfterDeath = trigger.daysAfterDeath ?? 90;
      }
      // apiClient has no PUT helper — use fetch directly for this endpoint.
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const base = process.env.NEXT_PUBLIC_API_URL ?? '/api';
      const resp = await fetch(`${base}/messages/${id}/triggers`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(await resp.text());
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function seal() {
    try {
      setSaving(true);
      setError(null);
      const id = await ensureDraft();
      await apiClient.post(`/messages/${id}/seal`, {});
      router.push(`/app/messages/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/app/messages" className="text-sm text-navy-700 hover:text-navy-900">
          ← Back to messages
        </Link>
        <div className="text-sm text-ink-500">
          Step {stepIndex + 1} of {STEP_ORDER.length}
        </div>
      </div>

      <ProgressRail step={step} />

      <div className="mt-8">
        {step === 'PROMPT' && (
          <PromptStep
            selected={prompt}
            onSelect={(p) => setPrompt(p)}
            onNext={next}
          />
        )}
        {step === 'MODE' && <ModeStep mode={mode} setMode={setMode} onNext={next} />}
        {step === 'WRITE' && (
          <WriteStep
            mode={mode}
            title={title}
            setTitle={setTitle}
            body={body}
            setBody={setBody}
            prompt={prompt}
            onNext={saveBodyAndAdvance}
            saving={saving}
          />
        )}
        {step === 'RECIPIENTS' && (
          <RecipientsStep
            picked={pickedPersonIds}
            setPicked={setPickedPersonIds}
            onNext={saveRecipientsAndAdvance}
            saving={saving}
          />
        )}
        {step === 'TRIGGER' && (
          <TriggerStep
            trigger={trigger}
            setTrigger={setTrigger}
            pickedPersonIds={pickedPersonIds}
            onNext={saveTriggerAndAdvance}
            saving={saving}
          />
        )}
        {step === 'REVIEW' && (
          <ReviewStep
            title={title || 'Untitled message'}
            mode={mode}
            body={body}
            pickedPersonIds={pickedPersonIds}
            trigger={trigger}
            onSeal={seal}
            saving={saving}
          />
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        {stepIndex > 0 ? (
          <Button variant="secondary" onClick={back} disabled={saving}>
            Back
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

// ---- progress rail ------------------------------------------------------
function ProgressRail({ step }: { step: Step }) {
  const labels: Record<Step, string> = {
    PROMPT: 'Prompt',
    MODE: 'Format',
    WRITE: 'Compose',
    RECIPIENTS: 'Who',
    TRIGGER: 'When',
    REVIEW: 'Seal',
  };
  const cur = STEP_ORDER.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {STEP_ORDER.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div
            className={`h-2 w-full rounded-full ${
              i <= cur ? 'bg-accent-500' : 'bg-ink-200'
            }`}
          />
          {i === STEP_ORDER.length - 1 && (
            <span className="whitespace-nowrap text-xs text-ink-500">{labels[s]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- PROMPT step --------------------------------------------------------
function PromptStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: Prompt | null;
  onSelect: (p: Prompt | null) => void;
  onNext: () => void;
}) {
  const { data: prompts = [], isLoading } = useList<Prompt>('message-prompts', '/messages/prompts');
  const [category, setCategory] = useState<string>('STORY');

  const categories = useMemo(() => {
    const set = new Set(prompts.map((p) => p.category));
    return Array.from(set);
  }, [prompts]);

  const filtered = prompts.filter((p) => p.category === category);

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-navy-900">Need somewhere to start?</h2>
      <p className="mb-6 text-ink-500">
        Pick a prompt, or skip to write your own. Prompts get you past the blank page — you can still write whatever you want.
      </p>

      {isLoading ? (
        <div className="text-ink-500">Loading prompts…</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-sm ${
                  category === c
                    ? 'bg-navy-700 text-ink-50'
                    : 'border border-ink-300 text-navy-900 hover:bg-ink-100'
                }`}
              >
                {CATEGORY_LABELS[c] ?? c}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selected?.id === p.id
                    ? 'border-accent-500 bg-accent-50'
                    : 'border-ink-200 bg-white hover:border-navy-300'
                }`}
              >
                <div className="mb-1 font-medium text-navy-900">{p.title}</div>
                <div className="text-sm text-ink-600">{p.body}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => {
            onSelect(null);
            onNext();
          }}
          className="text-sm text-ink-500 underline-offset-2 hover:text-navy-700 hover:underline"
        >
          I'll write my own
        </button>
        <Button onClick={onNext}>{selected ? 'Use this prompt' : 'Skip'}</Button>
      </div>
    </div>
  );
}

// ---- MODE step ----------------------------------------------------------
function ModeStep({
  mode,
  setMode,
  onNext,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-navy-900">How do you want to say it?</h2>
      <p className="mb-6 text-ink-500">
        A written letter, or your voice recording itself.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => setMode('LETTER')}
          className={`rounded-lg border-2 p-6 text-left transition-colors ${
            mode === 'LETTER' ? 'border-accent-500 bg-accent-50' : 'border-ink-200 bg-white hover:border-navy-300'
          }`}
        >
          <div className="mb-2 font-serif text-xl text-navy-900">Letter</div>
          <p className="text-sm text-ink-600">
            Write it down. Good when you want to take your time and get the words right.
          </p>
        </button>

        <div className="relative rounded-lg border-2 border-ink-200 bg-ink-50 p-6 opacity-80">
          <span className="absolute right-3 top-3 rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-800">
            Coming soon
          </span>
          <div className="mb-2 font-serif text-xl text-navy-900">Audio</div>
          <p className="text-sm text-ink-600">
            Record your voice. The most personal way to leave something — and still re-listenable decades later.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

// ---- WRITE step ---------------------------------------------------------
function WriteStep({
  mode,
  title,
  setTitle,
  body,
  setBody,
  prompt,
  onNext,
  saving,
}: {
  mode: Mode;
  title: string;
  setTitle: (s: string) => void;
  body: string;
  setBody: (s: string) => void;
  prompt: Prompt | null;
  onNext: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-navy-900">
        {mode === 'LETTER' ? 'Write it down' : 'Record your message'}
      </h2>
      <p className="mb-6 text-ink-500">
        Take your time. You can keep editing until you seal it.
      </p>

      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. For your 18th birthday"
        />
      </Field>

      {prompt && (
        <div className="mb-4 rounded-lg border-l-4 border-accent-500 bg-accent-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-800">
            {CATEGORY_LABELS[prompt.category] ?? prompt.category}
          </div>
          <div className="mt-1 font-serif text-lg text-navy-900">{prompt.title}</div>
          <p className="mt-1 text-sm text-ink-700">{prompt.body}</p>
        </div>
      )}

      <Field label="What you want to say">
        <Textarea
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            prompt
              ? 'Just start where you want. You can ramble — edit later.'
              : 'Write whatever you want them to hear from you.'
          }
        />
      </Field>

      <div className="mt-8 flex justify-end">
        <Button onClick={onNext} disabled={!title.trim() || !body.trim() || saving}>
          {saving ? 'Saving…' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

// ---- RECIPIENTS step ----------------------------------------------------
function RecipientsStep({
  picked,
  setPicked,
  onNext,
  saving,
}: {
  picked: string[];
  setPicked: (ids: string[]) => void;
  onNext: () => void;
  saving: boolean;
}) {
  const { data: people = [], isLoading } = useList<Person>('persons', '/persons');

  function toggle(id: string) {
    setPicked(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
  }

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-navy-900">Who is this for?</h2>
      <p className="mb-6 text-ink-500">
        Pick one or more people. You can send the same message to several recipients at once.
      </p>

      {isLoading && <div className="text-ink-500">Loading…</div>}

      {!isLoading && people.length === 0 && (
        <Card>
          <p className="mb-4 text-ink-700">
            You haven't added anyone to your people yet. Add a contact first, then come back here.
          </p>
          <Link href="/app/people">
            <Button variant="secondary">Add someone</Button>
          </Link>
        </Card>
      )}

      {people.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                picked.includes(p.id)
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-ink-200 bg-white hover:border-navy-300'
              }`}
            >
              <div className="font-medium text-navy-900">
                {p.firstName} {p.lastName}
              </div>
              {p.dateOfBirth && (
                <div className="text-xs text-ink-500">
                  Born {new Date(p.dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button onClick={onNext} disabled={picked.length === 0 || saving}>
          {saving ? 'Saving…' : `Continue with ${picked.length} ${picked.length === 1 ? 'recipient' : 'recipients'}`}
        </Button>
      </div>
    </div>
  );
}

// ---- TRIGGER step -------------------------------------------------------
type TriggerState =
  | { kind: 'TIME_ABSOLUTE'; releaseAt: string }
  | { kind: 'TIME_RELATIVE_TO_DOB'; ageYears?: number }
  | { kind: 'LIFE_EVENT'; eventKind?: string }
  | { kind: 'DEATH_PLUS'; daysAfterDeath?: number };

const EVENT_OPTIONS = [
  { value: 'GRADUATION', label: 'When they graduate' },
  { value: 'MARRIAGE', label: 'When they get married' },
  { value: 'FIRST_CHILD', label: 'When they have their first child' },
  { value: 'DIVORCE', label: 'If they go through a divorce' },
  { value: 'JOB_LOSS', label: 'If they lose their job' },
  { value: 'DIAGNOSIS', label: 'In case of a serious diagnosis' },
  { value: 'GRIEF_FIRST_YEAR', label: 'In their first year of grieving' },
];

function TriggerStep({
  trigger,
  setTrigger,
  pickedPersonIds: _pickedPersonIds,
  onNext,
  saving,
}: {
  trigger: TriggerState;
  setTrigger: (t: TriggerState) => void;
  pickedPersonIds: string[];
  onNext: () => void;
  saving: boolean;
}) {
  const kind = trigger.kind;

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-navy-900">When should they get it?</h2>
      <p className="mb-6 text-ink-500">
        Pick a specific date, tie it to a birthday, wait for a life event, or set it to deliver after you're gone.
      </p>

      <div className="mb-6 grid gap-2 md:grid-cols-2">
        <TriggerTab
          active={kind === 'TIME_ABSOLUTE'}
          title="A specific date"
          body="A calendar date you pick now."
          onClick={() =>
            setTrigger({ kind: 'TIME_ABSOLUTE', releaseAt: (trigger as { releaseAt?: string }).releaseAt ?? '' })
          }
        />
        <TriggerTab
          active={kind === 'TIME_RELATIVE_TO_DOB'}
          title="Their birthday"
          body="On their Nth birthday, based on their date of birth."
          onClick={() =>
            setTrigger({
              kind: 'TIME_RELATIVE_TO_DOB',
              ageYears: (trigger as { ageYears?: number }).ageYears,
            })
          }
        />
        <TriggerTab
          active={kind === 'LIFE_EVENT'}
          title="A life event"
          body="Graduation, marriage, first child. Needs a trusted-contact attestation at the time."
          onClick={() =>
            setTrigger({
              kind: 'LIFE_EVENT',
              eventKind: (trigger as { eventKind?: string }).eventKind,
            })
          }
        />
        <TriggerTab
          active={kind === 'DEATH_PLUS'}
          title="After I'm gone"
          body="Some number of days after my verified passing. Default 90."
          onClick={() =>
            setTrigger({
              kind: 'DEATH_PLUS',
              daysAfterDeath: (trigger as { daysAfterDeath?: number }).daysAfterDeath ?? 90,
            })
          }
        />
      </div>

      <Card>
        {kind === 'TIME_ABSOLUTE' && (
          <Field label="Release date and time">
            <Input
              type="datetime-local"
              value={(trigger as { releaseAt: string }).releaseAt}
              onChange={(e) =>
                setTrigger({ kind: 'TIME_ABSOLUTE', releaseAt: e.target.value })
              }
            />
          </Field>
        )}
        {kind === 'TIME_RELATIVE_TO_DOB' && (
          <Field label="Age on their birthday">
            <Input
              type="number"
              min={1}
              max={120}
              value={(trigger as { ageYears?: number }).ageYears ?? ''}
              onChange={(e) =>
                setTrigger({
                  kind: 'TIME_RELATIVE_TO_DOB',
                  ageYears: Number(e.target.value) || undefined,
                })
              }
              placeholder="e.g. 18"
            />
          </Field>
        )}
        {kind === 'LIFE_EVENT' && (
          <Field label="Which event">
            <Select
              value={(trigger as { eventKind?: string }).eventKind ?? ''}
              onChange={(e) => setTrigger({ kind: 'LIFE_EVENT', eventKind: e.target.value || undefined })}
            >
              <option value="">Pick an event…</option>
              {EVENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {kind === 'DEATH_PLUS' && (
          <>
            <Field label="Days after my verified passing">
              <Input
                type="number"
                min={0}
                max={3650}
                value={(trigger as { daysAfterDeath?: number }).daysAfterDeath ?? 90}
                onChange={(e) =>
                  setTrigger({
                    kind: 'DEATH_PLUS',
                    daysAfterDeath: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <p className="mt-2 text-sm text-ink-500">
              Tip: a short grace period lets your family handle arrangements before messages start arriving. 90 days is typical.
            </p>
          </>
        )}
      </Card>

      <div className="mt-8 flex justify-end">
        <Button onClick={onNext} disabled={!triggerIsComplete(trigger) || saving}>
          {saving ? 'Saving…' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

function triggerIsComplete(t: TriggerState): boolean {
  if (t.kind === 'TIME_ABSOLUTE') return !!t.releaseAt;
  if (t.kind === 'TIME_RELATIVE_TO_DOB') return t.ageYears != null && t.ageYears > 0;
  if (t.kind === 'LIFE_EVENT') return !!t.eventKind;
  if (t.kind === 'DEATH_PLUS') return t.daysAfterDeath != null;
  return false;
}

function TriggerTab({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-left transition-colors ${
        active ? 'border-accent-500 bg-accent-50' : 'border-ink-200 bg-white hover:border-navy-300'
      }`}
    >
      <div className="font-medium text-navy-900">{title}</div>
      <div className="mt-1 text-sm text-ink-600">{body}</div>
    </button>
  );
}

// ---- REVIEW step --------------------------------------------------------
function ReviewStep({
  title,
  mode,
  body,
  pickedPersonIds,
  trigger,
  onSeal,
  saving,
}: {
  title: string;
  mode: Mode;
  body: string;
  pickedPersonIds: string[];
  trigger: TriggerState;
  onSeal: () => void;
  saving: boolean;
}) {
  const { data: people = [] } = useList<Person>('persons', '/persons');
  const recipients = people.filter((p) => pickedPersonIds.includes(p.id));

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-navy-900">One last look</h2>
      <p className="mb-6 text-ink-500">
        Review everything. Once you seal this, you can still revoke it — but you can't edit it.
      </p>

      <Card>
        <dl className="divide-y divide-ink-200">
          <ReviewRow label="Title" value={title} />
          <ReviewRow label="Format" value={mode === 'LETTER' ? 'Written letter' : 'Audio recording'} />
          <ReviewRow
            label="Recipients"
            value={recipients.map((r) => `${r.firstName} ${r.lastName}`).join(', ') || '—'}
          />
          <ReviewRow label="When" value={triggerSummary(trigger)} />
          <ReviewRow
            label="Preview"
            value={
              <div className="whitespace-pre-wrap text-sm text-ink-700">
                {body.length > 400 ? body.slice(0, 400) + '…' : body}
              </div>
            }
          />
        </dl>
      </Card>

      <div className="mt-8 flex flex-col items-end gap-3">
        <Button onClick={onSeal} disabled={saving} size="lg">
          {saving ? 'Sealing…' : 'Seal this message'}
        </Button>
        <p className="text-xs text-ink-500">
          Sealing locks the content. Your recipients will be notified when their trigger fires.
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3">
      <dt className="text-sm font-medium text-ink-500">{label}</dt>
      <dd className="col-span-2 text-sm text-navy-900">{value}</dd>
    </div>
  );
}

function triggerSummary(t: TriggerState): string {
  if (t.kind === 'TIME_ABSOLUTE')
    return t.releaseAt
      ? `On ${new Date(t.releaseAt).toLocaleString()}`
      : '—';
  if (t.kind === 'TIME_RELATIVE_TO_DOB')
    return t.ageYears ? `On their ${t.ageYears}${suffix(t.ageYears)} birthday` : '—';
  if (t.kind === 'LIFE_EVENT') {
    const o = EVENT_OPTIONS.find((e) => e.value === t.eventKind);
    return o ? o.label : '—';
  }
  if (t.kind === 'DEATH_PLUS') return `${t.daysAfterDeath ?? 90} days after my verified passing`;
  return '—';
}

function suffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'] as const;
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
}

