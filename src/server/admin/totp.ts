import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import qrcode from 'qrcode-generator';

/** Time-based one-time passwords (RFC 6238, as authenticator apps use them): SHA-1, 6 digits, 30 s. */
export const totpPeriodSeconds = 30;
export const totpDigits = 6;
/** Steps accepted before and after the current one, for clocks that are a little off. */
export const totpDriftSteps = 1;
/** 160 bits, the size RFC 4226 recommends. */
export const totpSecretBytes = 20;

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) output += base32Alphabet.charAt((value << (5 - bits)) & 31);
  return output;
}

/** Decodes base32, ignoring spaces, dashes and case. Undefined when a character is not base32. */
export function base32Decode(text: string): Buffer | undefined {
  const clean = text.replace(/[\s-]/g, '').toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = base32Alphabet.indexOf(char);
    if (index < 0) return undefined;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A new random secret, as base32 text (what the admin types in the app). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(totpSecretBytes));
}

/** The time step a moment belongs to. */
export function stepAt(now: Date): number {
  return Math.floor(now.getTime() / 1000 / totpPeriodSeconds);
}

/** The code of a time step, for a base32 secret. */
export function totpCode(secret: string, step: number): string {
  const key = base32Decode(secret);
  if (!key) throw new Error('The secret is not valid base32.');
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', key).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 15;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff);
  return String(binary % 10 ** totpDigits).padStart(totpDigits, '0');
}

export type TotpCheck =
  { status: 'ok'; step: number } | { status: 'replayed' } | { status: 'invalid' };

function sameText(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Checks a typed code against a secret at a given moment. The code may belong to the current step
 * or to one step either way. A step at or before `lastUsedStep` is `replayed`: a code works once.
 */
export function checkTotp(
  secret: string,
  code: string,
  now: Date,
  lastUsedStep: number | null,
): TotpCheck {
  if (!/^\d{6}$/.test(code)) return { status: 'invalid' };
  const current = stepAt(now);
  let matched: number | undefined;
  for (let offset = -totpDriftSteps; offset <= totpDriftSteps; offset++) {
    // Every candidate is compared, so the time taken does not tell which one matched.
    if (sameText(totpCode(secret, current + offset), code)) matched ??= current + offset;
  }
  if (matched === undefined) return { status: 'invalid' };
  if (lastUsedStep !== null && matched <= lastUsedStep) return { status: 'replayed' };
  return { status: 'ok', step: matched };
}

/** The address an authenticator app reads from the QR code. */
export function otpauthUri(input: { secret: string; account: string; issuer: string }): string {
  const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.account)}`;
  const query = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: 'SHA1',
    digits: String(totpDigits),
    period: String(totpPeriodSeconds),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

/** The secret in groups of four letters, easier to read and type. */
export function groupSecret(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, '$1 ');
}

/**
 * A QR code as inline SVG, drawn on the server: nothing is sent to an outside service. The
 * colours come from the page's stylesheet (`.qr`), not from this markup.
 */
export function qrSvg(text: string, label: string): string {
  const code = qrcode(0, 'M');
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  const quiet = 4;
  let path = '';
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (code.isDark(row, column)) {
        path += `M${String(column + quiet)} ${String(row + quiet)}h1v1h-1z`;
      }
    }
  }
  const side = String(size + quiet * 2);
  const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" role="img" aria-label="${escaped}" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
}
