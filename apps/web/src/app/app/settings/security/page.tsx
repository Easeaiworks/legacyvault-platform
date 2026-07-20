'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Input, Field } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

interface Status {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  mfaEnforced: boolean;
}

interface SetupResponse {
  secret: string;
  otpauthUri: string;
}

interface VerifyResponse {
  enrolled?: boolean;
  verified?: boolean;
  backupCodes?: string[];
}

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const s = await apiClient.get<Status>('/2fa/status');
      setStatus(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (loading) return <div className="text-ink-500">Loading…</div>;

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy-900">Security</h1>
      <p className="mt-1 max-w-2xl text-ink-500">
        Protect your vault with two-factor authentication. When enabled, sign-in requires both
        your password and a 6-digit code from an authenticator app (Google Authenticator, Authy,
        1Password, or any TOTP-compatible app).
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardSubtitle>
            {status?.enabled
              ? `Enabled since ${new Date(status.enabledAt!).toLocaleDateString()}. ${
                  status.backupCodesRemaining
                } backup code${status.backupCodesRemaining === 1 ? '' : 's'} remaining.`
              : 'Not enabled. Highly recommended.'}
          </CardSubtitle>
        </CardHeader>

        {status?.enabled ? <EnabledPanel onChanged={reload} /> : <SetupPanel onDone={reload} />}
      </Card>
    </div>
  );
}

function SetupPanel({ onDone }: { onDone: () => void }) {
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const s = await apiClient.post<SetupResponse>('/2fa/setup', {});
      setSetup(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.post<VerifyResponse>('/2fa/verify', { code });
      if (r.backupCodes) setBackupCodes(r.backupCodes);
      else onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  if (backupCodes) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-sage-300 bg-sage-100/40 p-4 text-sm text-sage-800">
          <strong>2FA enabled.</strong> Save these backup codes now — you won&apos;t see them again.
          Each is single-use and can be used in place of an authenticator code.
        </div>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-ink-50 p-4 font-mono text-sm">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(backupCodes.join('\n'));
          }}
        >
          Copy to clipboard
        </Button>
        <Button variant="secondary" onClick={onDone}>
          I&apos;ve saved them
        </Button>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        {error && <div className="text-sm text-red-700">{error}</div>}
        <Button onClick={startSetup} disabled={busy}>
          {busy ? 'Starting…' : 'Enable 2FA'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-700">
        Scan this QR code with your authenticator app, or enter the secret manually:
      </p>
      <div className="rounded-md bg-ink-50 p-4">
        <div className="mb-3 flex justify-center">
          <img
            alt="TOTP QR code"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
              setup.otpauthUri,
            )}`}
            width={200}
            height={200}
          />
        </div>
        <div className="text-center font-mono text-sm text-ink-700">{setup.secret}</div>
      </div>
      <Field label="Enter the 6-digit code from your app" hint="Codes rotate every 30 seconds.">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          maxLength={6}
          placeholder="000000"
          className="font-mono text-lg tracking-widest"
        />
      </Field>
      {error && <div className="text-sm text-red-700">{error}</div>}
      <Button onClick={verify} disabled={busy || code.length !== 6}>
        {busy ? 'Verifying…' : 'Verify and enable'}
      </Button>
    </div>
  );
}

function EnabledPanel({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  async function rotate() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.post<{ backupCodes: string[] }>('/2fa/backup-codes', { code });
      setNewCodes(r.backupCodes);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rotate failed');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post('/2fa/disable', { code });
      setCode('');
      setConfirmDisable(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disable failed');
    } finally {
      setBusy(false);
    }
  }

  if (newCodes) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-sage-300 bg-sage-100/40 p-4 text-sm text-sage-800">
          <strong>New backup codes issued.</strong> Old codes are now invalid.
        </div>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-ink-50 p-4 font-mono text-sm">
          {newCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button variant="secondary" onClick={() => setNewCodes(null)}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field
        label={confirmDisable ? 'Confirm disable with a live code or backup code' : 'Enter a live 6-digit code'}
        hint="Required for any change to your 2FA settings."
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000 or backup code"
          className="font-mono text-lg tracking-widest"
        />
      </Field>
      {error && <div className="text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={rotate} disabled={busy || code.length !== 6}>
          Rotate backup codes
        </Button>
        {!confirmDisable ? (
          <Button variant="secondary" onClick={() => setConfirmDisable(true)}>
            Disable 2FA…
          </Button>
        ) : (
          <>
            <Button variant="danger" onClick={disable} disabled={busy || !code}>
              Confirm disable
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDisable(false);
                setCode('');
              }}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
