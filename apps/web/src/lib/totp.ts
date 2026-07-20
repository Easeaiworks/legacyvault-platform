/**
 * TOTP (RFC 6238) implementation using Node's crypto only — no external deps.
 * Generates 6-digit codes on 30-second windows. Supports ±1 window drift.
 *
 * We store the shared secret encrypted with APP_ENC_KEY (see lib/crypto.ts).
 */

import { createHmac, randomBytes } from 'crypto';

const STEP_SECONDS = 30;
const DIGITS = 6;
const DRIFT_WINDOWS = 1; // accept t-1, t, t+1

/** Generate a fresh base32-encoded TOTP secret (160 bits / 20 bytes). */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Generate the `otpauth://` URI that Google Authenticator, 1Password etc. consume. */
export function otpauthUri(secret: string, account: string, issuer = 'LegacyVault'): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Verify a 6-digit code against the secret. Returns true if within drift window. */
export function verifyCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let d = -DRIFT_WINDOWS; d <= DRIFT_WINDOWS; d++) {
    const expected = hotp(key, now + d);
    if (constantTimeEq(expected, code)) return true;
  }
  return false;
}

/** Generate N one-time backup codes (10 hex chars each). Returns {plain, hashed}. */
export function generateBackupCodes(n = 10): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = randomBytes(5).toString('hex'); // 10 hex chars
    plain.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { plain, hashed };
}

/** Look for a matching backup code; returns the hash to remove (or null). */
export function matchBackupCode(hashed: string[], code: string): string | null {
  const target = hashBackupCode(code.trim().toLowerCase());
  return hashed.find((h) => constantTimeEq(h, target)) ?? null;
}

// ---- internals ------------------------------------------------------------

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // JS doesn't do 64-bit ints; write hi/lo separately.
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const code = (bin % 10 ** DIGITS).toString().padStart(DIGITS, '0');
  return code;
}

function hashBackupCode(code: string): string {
  // Simple SHA-256 hash — codes are single-use and high-entropy (40 bits).
  return createHmac('sha256', 'legacyvault-backup-codes').update(code).digest('hex');
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- base32 (RFC 4648) ----------------------------------------------------

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 0x1f];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error(`invalid base32 character ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
