/**
 * Server-side field-level encryption.
 *
 * For sensitive-but-searchable fields that must be encrypted at rest but
 * decryptable by the app tier (e.g. full SSN for SSA Death Master File lookups,
 * where the search worker needs the plaintext).
 *
 * NOT for zero-knowledge fields (credential vault, message bodies) — those are
 * encrypted client-side with vault-crypto.ts and the server never sees plaintext.
 *
 * Format: base64(version_byte || iv_12 || ciphertext || tag_16)
 * Cipher: AES-256-GCM
 * Key: APP_ENC_KEY env var (32 bytes, base64 or hex encoded)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 0x01;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.APP_ENC_KEY;
  if (!raw) {
    throw new Error(
      'APP_ENC_KEY is not set. Field-level encryption requires a 32-byte key ' +
        '(base64 or hex encoded) in the APP_ENC_KEY env var.',
    );
  }
  // Try base64 first, then hex.
  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_LEN) throw new Error('bad length');
  } catch {
    key = Buffer.from(raw, 'hex');
  }
  if (key.length !== KEY_LEN) {
    throw new Error(`APP_ENC_KEY must be ${KEY_LEN} bytes; got ${key.length}`);
  }
  cachedKey = key;
  return key;
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, ct, tag]).toString('base64');
}

export function decryptField(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 1 + IV_LEN + TAG_LEN) throw new Error('ciphertext too short');
  const version = buf.readUInt8(0);
  if (version !== VERSION) throw new Error(`unsupported ciphertext version ${version}`);
  const iv = buf.subarray(1, 1 + IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(1 + IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
