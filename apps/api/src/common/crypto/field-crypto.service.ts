import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Envelope-style field-level encryption for sensitive columns
 * (SSN/SIN, account numbers, addresses, instruction bodies, etc.).
 *
 * Algorithm: AES-256-GCM
 * Format:    base64( version(1) || iv(12) || authTag(16) || ciphertext )
 *
 * In production, the master key should come from AWS KMS via GenerateDataKey
 * rather than a static env var. This service accepts a static key for local dev
 * and leaves a TODO to swap in KMS for production — see MIGRATE_TO_KMS.md.
 */
@Injectable()
export class FieldCryptoService {
  private readonly logger = new Logger(FieldCryptoService.name);
  private readonly key: Buffer;
  private static readonly VERSION = 0x01;
  private static readonly IV_LEN = 12;
  private static readonly AUTH_TAG_LEN = 16;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('FIELD_ENCRYPTION_KEY', { infer: true });
    if (!raw) {
      throw new Error('FIELD_ENCRYPTION_KEY is required');
    }
    this.key = Buffer.from(raw, 'base64');
    if (this.key.length !== 32) {
      throw new Error('FIELD_ENCRYPTION_KEY must decode to 32 bytes');
    }
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return null;
    }
    const iv = randomBytes(FieldCryptoService.IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const packed = Buffer.concat([
      Buffer.from([FieldCryptoService.VERSION]),
      iv,
      authTag,
      ciphertext,
    ]);
    return packed.toString('base64');
  }

  decrypt(ciphertextB64: string | null | undefined): string | null {
    if (ciphertextB64 === null || ciphertextB64 === undefined || ciphertextB64 === '') {
      return null;
    }
    const packed = Buffer.from(ciphertextB64, 'base64');
    const version = packed[0];
    if (version !== FieldCryptoService.VERSION) {
      throw new Error(`Unsupported encryption version: ${version}`);
    }
    const iv = packed.subarray(1, 1 + FieldCryptoService.IV_LEN);
    const authTag = packed.subarray(
      1 + FieldCryptoService.IV_LEN,
      1 + FieldCryptoService.IV_LEN + FieldCryptoService.AUTH_TAG_LEN,
    );
    const ciphertext = packed.subarray(1 + FieldCryptoService.IV_LEN + FieldCryptoService.AUTH_TAG_LEN);

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    try {
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf8');
    } catch (err) {
      this.logger.error('Field decryption failed — possible key rotation or corruption');
      throw err;
    }
  }

  /** Convenience for things like account numbers: returns { last4, ciphertext }. */
  encryptAccountNumber(raw: string | null | undefined): { last4: string | null; ciphertext: string | null } {
    if (!raw) return { last4: null, ciphertext: null };
    const digits = raw.replace(/\D/g, '');
    const last4 = digits.length >= 4 ? digits.slice(-4) : null;
    return { last4, ciphertext: this.encrypt(raw) };
  }
}
