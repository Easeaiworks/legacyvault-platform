'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Field, Textarea } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import {
  createVault,
  decryptJson,
  encryptJson,
  unlockWithPassword,
  unlockWithRecoveryCode,
  type VaultConfig,
} from '@/lib/vault-crypto';

interface CredentialEntry {
  id: string;
  label: string;
  provider: string | null;
  kind: string;
  ciphertextBase64: string;
  ivBase64: string;
  intendedAction: string;
  updatedAt: string;
}

interface DecryptedCredential {
  username?: string;
  password?: string;
  notes?: string;
  securityQuestions?: Array<{ question: string; answer: string }>;
}

type VaultState =
  | { kind: 'LOADING' }
  | { kind: 'NOT_INITIALIZED' }
  | { kind: 'LOCKED'; config: VaultConfig }
  | { kind: 'UNLOCKED'; config: VaultConfig; vmkKey: CryptoKey };

const AUTO_LOCK_MS = 15 * 60 * 1000; // 15 minutes

export default function VaultPage() {
  const [state, setState] = useState<VaultState>({ kind: 'LOADING' });
  const autoLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadConfig();
    return () => {
      if (autoLockRef.current) clearTimeout(autoLockRef.current);
    };
  }, []);

  async function loadConfig() {
    const cfg = await apiClient.get<VaultConfig | null>('/vault/config');
    if (!cfg) setState({ kind: 'NOT_INITIALIZED' });
    else setState({ kind: 'LOCKED', config: cfg });
  }

  function scheduleAutoLock(config: VaultConfig) {
    if (autoLockRef.current) clearTimeout(autoLockRef.current);
    autoLockRef.current = setTimeout(() => {
      setState({ kind: 'LOCKED', config });
    }, AUTO_LOCK_MS);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-medium text-navy-900">Credential vault</h1>
        <p className="mt-2 text-ink-700">
          Zero-knowledge storage for logins, security-question answers, seed phrases, and
          recovery codes. Your family can access these after you&apos;re gone — we can&apos;t.
        </p>
      </div>

      {state.kind === 'LOADING' && <div className="text-ink-500">Loading…</div>}

      {state.kind === 'NOT_INITIALIZED' && (
        <SetupWizard
          onComplete={(config, vmkKey) => {
            scheduleAutoLock(config);
            setState({ kind: 'UNLOCKED', config, vmkKey });
          }}
        />
      )}

      {state.kind === 'LOCKED' && (
        <UnlockForm
          config={state.config}
          onUnlock={(vmkKey) => {
            scheduleAutoLock(state.config);
            setState({ kind: 'UNLOCKED', config: state.config, vmkKey });
          }}
        />
      )}

      {state.kind === 'UNLOCKED' && (
        <CredentialsList
          vmkKey={state.vmkKey}
          onLock={() => {
            if (autoLockRef.current) clearTimeout(autoLockRef.current);
            setState({ kind: 'LOCKED', config: state.config });
          }}
        />
      )}
    </div>
  );
}

// ---- Setup Wizard ---------------------------------------------------

function SetupWizard({
  onComplete,
}: {
  onComplete: (config: VaultConfig, vmkKey: CryptoKey) => void;
}) {
  const [step, setStep] = useState<'INTRO' | 'PASSWORD' | 'CODE' | 'CONFIRM'>('INTRO');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{
    recoveryCode: string;
    config: VaultConfig;
    vmkKey: CryptoKey;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function generateAndSave() {
    setError(null);
    if (password.length < 12) {
      setError('Vault password must be at least 12 characters.');
      return;
    }
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { recoveryCode, config, vmkKey } = await createVault(password);
      // POST config to server; server only sees ciphertext + salt.
      const saved = await apiClient.post<VaultConfig>('/vault/config', {
        kdfAlgorithm: config.kdfAlgorithm,
        kdfIterations: config.kdfIterations,
        kdfSaltBase64: config.kdfSaltBase64,
        vmkWrappedByPasswordBase64: config.vmkWrappedByPasswordBase64,
        vmkWrappedByPasswordIvBase64: config.vmkWrappedByPasswordIvBase64,
        vmkWrappedByRecoveryBase64: config.vmkWrappedByRecoveryBase64,
        vmkWrappedByRecoveryIvBase64: config.vmkWrappedByRecoveryIvBase64,
      });
      setGenerated({ recoveryCode, config: saved, vmkKey });
      setStep('CODE');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    if (!generated) return;
    onComplete(generated.config, generated.vmkKey);
  }

  return (
    <Card>
      {step === 'INTRO' && (
        <div>
          <CardHeader>
            <CardTitle>Set up your credential vault</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-ink-700">
            <p>
              You&apos;re about to create a zero-knowledge vault for the credentials your
              family will need — the ones that let them close accounts, unlock your devices,
              cancel subscriptions, and access what matters.
            </p>
            <p>
              <strong className="text-navy-900">This is different from your login.</strong>{' '}
              You&apos;ll create a separate <em>Vault Password</em>. We never see it. If you
              forget it, only a printed <em>Recovery Code</em> can unlock the vault. If you
              lose both, the data is gone. That&apos;s the promise of zero-knowledge — even
              we can&apos;t restore it.
            </p>
            <p>
              Right now, print or securely save your recovery code with your will. That&apos;s
              the entire setup ritual.
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep('PASSWORD')}>Let&apos;s begin</Button>
          </div>
        </div>
      )}

      {step === 'PASSWORD' && (
        <div>
          <CardHeader>
            <CardTitle>Create your Vault Password</CardTitle>
          </CardHeader>
          <p className="mb-6 text-ink-700">
            At least 12 characters. Something you&apos;ll remember but nobody else will guess.
            Consider a passphrase (four random words) rather than a short complex password.
          </p>
          <Field label="Vault password">
            <Input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 12 characters"
            />
          </Field>
          <Field label="Confirm password">
            <Input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </Field>
          {error && (
            <div className="mt-3 rounded-md border border-terracotta-300 bg-terracotta-100 p-3 text-sm text-terracotta-700">
              {error}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep('INTRO')}>
              Back
            </Button>
            <Button
              onClick={generateAndSave}
              disabled={saving || password.length < 12 || password !== password2}
            >
              {saving ? 'Creating vault…' : 'Create vault'}
            </Button>
          </div>
        </div>
      )}

      {step === 'CODE' && generated && (
        <div>
          <CardHeader>
            <CardTitle>Your recovery code</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-ink-700">
            <p>
              This is the one thing we can&apos;t give you again. <strong>Print it</strong>,{' '}
              <strong>write it down</strong>, or <strong>save it to a password manager</strong>{' '}
              — and keep it with your will or in a bank safe deposit box.
            </p>
            <div className="rounded-2xl border-2 border-accent-300 bg-accent-100/60 p-8 text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
                Recovery code — write this down now
              </div>
              <div className="select-all font-mono text-2xl font-semibold tracking-widest text-navy-900">
                {generated.recoveryCode}
              </div>
            </div>
            <p className="text-sm text-ink-500">
              If you ever forget your vault password, this code lets you set a new one. If you
              lose <em>both</em> the password and the code, your credentials cannot be
              recovered — that&apos;s how zero-knowledge storage works. We don&apos;t have a
              backdoor.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4"
              />
              I&apos;ve saved my recovery code somewhere safe
            </label>
            <Button onClick={finish} disabled={!confirmed}>
              Enter the vault
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---- Unlock Form ----------------------------------------------------

function UnlockForm({
  config,
  onUnlock,
}: {
  config: VaultConfig;
  onUnlock: (vmkKey: CryptoKey) => void;
}) {
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const vmkKey = recoveryMode
        ? await unlockWithRecoveryCode(recoveryCode, config)
        : await unlockWithPassword(password, config);
      onUnlock(vmkKey);
    } catch {
      setError(recoveryMode ? 'Recovery code did not decrypt the vault.' : 'Wrong password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{recoveryMode ? 'Unlock with recovery code' : 'Unlock your vault'}</CardTitle>
      </CardHeader>
      <p className="mb-6 text-ink-700">
        {recoveryMode
          ? 'Enter the recovery code you printed when you set up the vault.'
          : 'Your Vault Password is separate from your account login.'}
      </p>
      {!recoveryMode ? (
        <Field label="Vault password">
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </Field>
      ) : (
        <Field label="Recovery code">
          <Input
            type="text"
            autoFocus
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder="e.g. K7M2-QX8P-JT94-N3RC-LB5H-Y8FZ"
            className="font-mono"
          />
        </Field>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-terracotta-300 bg-terracotta-100 p-3 text-sm text-terracotta-700">
          {error}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => {
            setRecoveryMode(!recoveryMode);
            setError(null);
          }}
          className="text-sm text-navy-700 underline underline-offset-2 hover:text-navy-900"
        >
          {recoveryMode ? 'Use vault password instead' : 'I forgot my password'}
        </button>
        <Button onClick={submit} disabled={busy || (recoveryMode ? !recoveryCode : !password)}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </Button>
      </div>
    </Card>
  );
}

// ---- Credentials List ----------------------------------------------

function CredentialsList({
  vmkKey,
  onLock,
}: {
  vmkKey: CryptoKey;
  onLock: () => void;
}) {
  const [entries, setEntries] = useState<CredentialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const list = await apiClient.get<CredentialEntry[]>('/vault/credentials');
    setEntries(list);
    setLoading(false);
  }

  async function removeEntry(id: string) {
    if (!confirm('Delete this credential?')) return;
    await apiClient.delete(`/vault/credentials/${id}`);
    void refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-sage-700">
            Vault unlocked · auto-locks in 15 min
          </div>
          <p className="mt-1 text-sm text-ink-500">
            The vault is decrypted in-memory only. Reload or leave idle to relock.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onLock}>
            Lock vault
          </Button>
          <Button onClick={() => setAdding(true)}>Add credential</Button>
        </div>
      </div>

      {loading && <div className="text-ink-500">Loading…</div>}

      {!loading && entries.length === 0 && (
        <Card>
          <p className="text-center text-ink-700">
            No credentials stored yet. Start with the ones your family will need first —
            phone unlock code, email account, primary bank login.
          </p>
        </Card>
      )}

      {entries.length > 0 && (
        <Card>
          <ul className="divide-y divide-ink-200">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-navy-900">{e.label}</div>
                  <div className="text-sm text-ink-500">
                    {e.provider && `${e.provider} · `}
                    {formatKind(e.kind)} · Updated{' '}
                    {new Date(e.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setViewingId(e.id)}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(e.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {adding && (
        <AddCredentialModal
          vmkKey={vmkKey}
          onClose={() => {
            setAdding(false);
            void refresh();
          }}
        />
      )}

      {viewingId && (
        <ViewCredentialModal
          entry={entries.find((e) => e.id === viewingId)!}
          vmkKey={vmkKey}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}

function formatKind(kind: string): string {
  const map: Record<string, string> = {
    LOGIN: 'Login',
    SECURITY_ANSWER: 'Security question',
    RECOVERY_CODE: 'Recovery code',
    SEED_PHRASE: 'Seed phrase',
    TOTP_SEED: '2FA seed',
    OTHER: 'Other',
  };
  return map[kind] ?? kind;
}

// ---- Add Modal -----------------------------------------------------

function AddCredentialModal({
  vmkKey,
  onClose,
}: {
  vmkKey: CryptoKey;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const [provider, setProvider] = useState('');
  const [kind, setKind] = useState('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const plaintext: DecryptedCredential = {
        username: username || undefined,
        password: password || undefined,
        notes: notes || undefined,
      };
      const { ciphertextBase64, ivBase64 } = await encryptJson(plaintext, vmkKey);
      await apiClient.post('/vault/credentials', {
        kind,
        label,
        provider: provider || undefined,
        ciphertextBase64,
        ivBase64,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-paper p-6 shadow-raised">
        <h2 className="mb-6 font-serif text-2xl font-medium text-navy-900">Add a credential</h2>
        <Field label="Kind">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm"
          >
            <option value="LOGIN">Login (username + password)</option>
            <option value="SECURITY_ANSWER">Security question answer</option>
            <option value="RECOVERY_CODE">Recovery code</option>
            <option value="SEED_PHRASE">Seed phrase / hardware wallet</option>
            <option value="TOTP_SEED">2FA authenticator seed</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Label">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Apple ID, Chase checking, Ledger seed"
          />
        </Field>
        <Field label="Provider (optional)">
          <Input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Apple, Chase, Ledger"
          />
        </Field>
        <Field label="Username / email (optional)">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Password / code / seed">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label="Notes (optional)">
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else your family will need — e.g., which security question, where the hardware wallet lives"
          />
        </Field>
        {error && (
          <div className="mb-3 rounded-md border border-terracotta-300 bg-terracotta-100 p-3 text-sm text-terracotta-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !label}>
            {saving ? 'Encrypting…' : 'Encrypt & save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- View Modal ----------------------------------------------------

function ViewCredentialModal({
  entry,
  vmkKey,
  onClose,
}: {
  entry: CredentialEntry;
  vmkKey: CryptoKey;
  onClose: () => void;
}) {
  const [decrypted, setDecrypted] = useState<DecryptedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await decryptJson<DecryptedCredential>(
          entry.ciphertextBase64,
          entry.ivBase64,
          vmkKey,
        );
        setDecrypted(d);
      } catch {
        setError('Failed to decrypt — key mismatch?');
      }
    })();
  }, [entry, vmkKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-paper p-6 shadow-raised">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-700">
          {formatKind(entry.kind)}
        </div>
        <h2 className="mb-6 font-serif text-2xl font-medium text-navy-900">{entry.label}</h2>
        {entry.provider && (
          <div className="mb-4 text-sm text-ink-500">Provider: {entry.provider}</div>
        )}
        {error && (
          <div className="rounded-md border border-terracotta-300 bg-terracotta-100 p-3 text-sm text-terracotta-700">
            {error}
          </div>
        )}
        {decrypted && (
          <dl className="space-y-3">
            {decrypted.username && <Row label="Username" value={decrypted.username} />}
            {decrypted.password && (
              <Row
                label="Password / code"
                value={reveal ? decrypted.password : '••••••••••'}
                onReveal={() => setReveal((r) => !r)}
                copy
                copyValue={decrypted.password}
              />
            )}
            {decrypted.notes && <Row label="Notes" value={decrypted.notes} />}
          </dl>
        )}
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onReveal,
  copy,
  copyValue,
}: {
  label: string;
  value: string;
  onReveal?: () => void;
  copy?: boolean;
  copyValue?: string;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr_auto] items-center gap-3 border-t border-ink-200 pt-3">
      <dt className="text-xs font-semibold uppercase tracking-widest text-ink-500">{label}</dt>
      <dd className="break-all font-mono text-sm text-navy-900">{value}</dd>
      <div className="flex gap-2">
        {onReveal && (
          <Button variant="ghost" size="sm" onClick={onReveal}>
            Show
          </Button>
        )}
        {copy && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(copyValue ?? value)}
          >
            Copy
          </Button>
        )}
      </div>
    </div>
  );
}
