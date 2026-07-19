/**
 * Zero-knowledge vault crypto helpers.
 *
 * All operations run in the browser using WebCrypto. Server never sees
 * plaintext, keys, vault password, or recovery code.
 *
 * Roadmap: PBKDF2 is a placeholder for launch — Argon2id is stronger against
 * GPU attacks and is what production-grade password managers use. Moving to
 * Argon2 requires shipping a wasm module (~50KB). Documented tradeoff.
 */

const KDF_ITERATIONS = 600_000; // OWASP 2024 minimum for PBKDF2-SHA256
const KDF_SALT_BYTES = 16;
const VMK_BYTES = 32; // 256-bit vault master key
const IV_BYTES = 12; // GCM standard IV size

// ---- primitives ------------------------------------------------------

export function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---- key derivation --------------------------------------------------

/**
 * Derive a 256-bit AES-GCM key from a passphrase (either the Vault Password
 * or the Recovery Code) using PBKDF2-SHA256. The same salt + iterations are
 * used for both so either can independently unlock.
 */
export async function deriveKey(
  passphrase: string,
  saltBase64: string,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const salt = fromBase64(saltBase64);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt'],
  );
}

// ---- vault master key handling --------------------------------------

/**
 * Generate a new Vault Master Key (VMK). Returns raw bytes; callers
 * immediately wrap it with password-derived and recovery-derived keys.
 */
export function generateVmk(): Uint8Array {
  return randomBytes(VMK_BYTES);
}

/**
 * Wrap the VMK bytes with an AES-GCM key. Returns ciphertext + IV, both base64.
 */
export async function wrapVmk(
  vmk: Uint8Array,
  wrappingKey: CryptoKey,
): Promise<{ ciphertextBase64: string; ivBase64: string }> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, vmk),
  );
  return { ciphertextBase64: toBase64(ciphertext), ivBase64: toBase64(iv) };
}

/**
 * Unwrap the VMK. Throws if authentication fails (wrong key).
 */
export async function unwrapVmk(
  ciphertextBase64: string,
  ivBase64: string,
  wrappingKey: CryptoKey,
): Promise<Uint8Array> {
  const ciphertext = fromBase64(ciphertextBase64);
  const iv = fromBase64(ivBase64);
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    ciphertext,
  );
  return new Uint8Array(raw);
}

/**
 * Import raw VMK bytes as an AES-GCM CryptoKey for encrypting credentials.
 */
export async function importVmkAsKey(vmk: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', vmk, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// ---- credential field encryption ------------------------------------

/**
 * Encrypt a JSON-serializable object with the VMK. Returns ciphertext + IV.
 */
export async function encryptJson(
  plaintext: unknown,
  vmkKey: CryptoKey,
): Promise<{ ciphertextBase64: string; ivBase64: string }> {
  const iv = randomBytes(IV_BYTES);
  const bytes = enc.encode(JSON.stringify(plaintext));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vmkKey, bytes),
  );
  return { ciphertextBase64: toBase64(ciphertext), ivBase64: toBase64(iv) };
}

/**
 * Decrypt an encrypted JSON blob with the VMK. Returns the parsed value.
 */
export async function decryptJson<T = unknown>(
  ciphertextBase64: string,
  ivBase64: string,
  vmkKey: CryptoKey,
): Promise<T> {
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivBase64) },
    vmkKey,
    fromBase64(ciphertextBase64),
  );
  return JSON.parse(dec.decode(raw)) as T;
}

// ---- recovery code ---------------------------------------------------

/**
 * Generate a human-transcribable recovery code.
 *
 * Format: 6 groups of 4 uppercase alphanumeric chars, dash-separated.
 * Example: "K7M2-QX8P-JT94-N3RC-LB5H-Y8FZ"
 *
 * Entropy: log2(32^24) ≈ 120 bits. (We exclude ambiguous 0/O/1/I/L.)
 *
 * The recovery code is what the user prints and stores physically with
 * their will. It never touches the server (only its derived key does).
 */
const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 chars, unambiguous

export function generateRecoveryCode(): string {
  const groups = 6;
  const chars = 4;
  const rand = randomBytes(groups * chars);
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    let chunk = '';
    for (let c = 0; c < chars; c++) {
      const idx = rand[g * chars + c]! % SAFE_ALPHABET.length;
      chunk += SAFE_ALPHABET[idx];
    }
    out.push(chunk);
  }
  return out.join('-');
}

/**
 * Normalize a recovery code — accept lowercase, strip dashes and spaces,
 * so users can transcribe it flexibly.
 */
export function normalizeRecoveryCode(input: string): string {
  return input.trim().toUpperCase().replace(/[-\s]/g, '');
}

// ---- vault setup + unlock convenience -------------------------------

export interface VaultConfig {
  kdfAlgorithm: string;
  kdfIterations: number;
  kdfSaltBase64: string;
  vmkWrappedByPasswordBase64: string;
  vmkWrappedByPasswordIvBase64: string;
  vmkWrappedByRecoveryBase64: string;
  vmkWrappedByRecoveryIvBase64: string;
  recoveryCodeHint: string | null;
}

/**
 * First-time vault setup. Generates a fresh VMK, wraps it with keys derived
 * from the vault password AND the recovery code, and returns the config for
 * the client to POST to the server.
 *
 * Also returns the VMK as a CryptoKey the caller can use to start encrypting
 * credentials immediately, without unlocking twice.
 */
export async function createVault(
  vaultPassword: string,
): Promise<{
  recoveryCode: string;
  config: VaultConfig;
  vmkKey: CryptoKey;
}> {
  if (vaultPassword.length < 12) {
    throw new Error('Vault password must be at least 12 characters.');
  }

  const salt = randomBytes(KDF_SALT_BYTES);
  const saltBase64 = toBase64(salt);
  const recoveryCode = generateRecoveryCode();
  const normalizedRecovery = normalizeRecoveryCode(recoveryCode);

  const vmk = generateVmk();

  const [pwKey, rcKey] = await Promise.all([
    deriveKey(vaultPassword, saltBase64),
    deriveKey(normalizedRecovery, saltBase64),
  ]);

  const [pwWrap, rcWrap] = await Promise.all([
    wrapVmk(vmk, pwKey),
    wrapVmk(vmk, rcKey),
  ]);

  const vmkKey = await importVmkAsKey(vmk);

  return {
    recoveryCode,
    vmkKey,
    config: {
      kdfAlgorithm: 'PBKDF2-SHA256',
      kdfIterations: KDF_ITERATIONS,
      kdfSaltBase64: saltBase64,
      vmkWrappedByPasswordBase64: pwWrap.ciphertextBase64,
      vmkWrappedByPasswordIvBase64: pwWrap.ivBase64,
      vmkWrappedByRecoveryBase64: rcWrap.ciphertextBase64,
      vmkWrappedByRecoveryIvBase64: rcWrap.ivBase64,
      recoveryCodeHint: null,
    },
  };
}

/**
 * Unlock a vault with the user's password. Returns the VMK CryptoKey.
 * Throws if password is wrong.
 */
export async function unlockWithPassword(
  vaultPassword: string,
  config: VaultConfig,
): Promise<CryptoKey> {
  const pwKey = await deriveKey(
    vaultPassword,
    config.kdfSaltBase64,
    config.kdfIterations,
  );
  const vmk = await unwrapVmk(
    config.vmkWrappedByPasswordBase64,
    config.vmkWrappedByPasswordIvBase64,
    pwKey,
  );
  return importVmkAsKey(vmk);
}

/**
 * Unlock with the recovery code. Same result — returns the VMK CryptoKey.
 */
export async function unlockWithRecoveryCode(
  recoveryCode: string,
  config: VaultConfig,
): Promise<CryptoKey> {
  const normalized = normalizeRecoveryCode(recoveryCode);
  const rcKey = await deriveKey(
    normalized,
    config.kdfSaltBase64,
    config.kdfIterations,
  );
  const vmk = await unwrapVmk(
    config.vmkWrappedByRecoveryBase64,
    config.vmkWrappedByRecoveryIvBase64,
    rcKey,
  );
  return importVmkAsKey(vmk);
}
