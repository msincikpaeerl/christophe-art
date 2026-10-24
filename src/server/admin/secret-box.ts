import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/**
 * Encrypts a text with AES-256-GCM. The result is `v1.<iv>.<tag>.<ciphertext>` (base64url), so it
 * can be stored in a text column and the format can change later.
 */
export function encryptText(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((part) => toText(part)).join('.');
}

function toText(part: string | Buffer): string {
  return typeof part === 'string' ? part : part.toString('base64url');
}

/** Decrypts what `encryptText` wrote. Throws when the key is wrong or the text was altered. */
export function decryptText(stored: string, key: Buffer): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unknown encrypted format.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** A keyed hash (HMAC-SHA-256) of a text, as hex: stored in place of a high-entropy code. */
export function keyedHash(text: string, key: Buffer): string {
  return createHmac('sha256', key).update(text).digest('hex');
}
