import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  checkTotp,
  generateTotpSecret,
  groupSecret,
  otpauthUri,
  qrSvg,
  stepAt,
  totpCode,
} from './totp.ts';

// RFC 6238 appendix B: the secret "12345678901234567890" (SHA-1). The RFC lists 8 digits; the
// last 6 are the 6-digit code.
const rfcSecret = base32Encode(Buffer.from('12345678901234567890'));
const at = (seconds: number) => new Date(seconds * 1000);

describe('totpCode', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC 6238 vector at %i s', (seconds, expected) => {
    expect(totpCode(rfcSecret, stepAt(at(seconds)))).toBe(expected);
  });
});

describe('checkTotp with a fixed clock', () => {
  const now = at(1_700_000_010);
  const step = stepAt(now);

  it('accepts the code of the current step', () => {
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step), now, null)).toEqual({
      status: 'ok',
      step,
    });
  });

  it('accepts one step of drift either way', () => {
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step - 1), now, null)).toEqual({
      status: 'ok',
      step: step - 1,
    });
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step + 1), now, null)).toEqual({
      status: 'ok',
      step: step + 1,
    });
  });

  it('refuses an expired code (two steps old) and a code from two steps ahead', () => {
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step - 2), now, null)).toEqual({
      status: 'invalid',
    });
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step + 2), now, null)).toEqual({
      status: 'invalid',
    });
  });

  it('accepts a code again later only inside its own window', () => {
    const code = totpCode(rfcSecret, step);
    const later = new Date(now.getTime() + 90_000);
    expect(checkTotp(rfcSecret, code, later, null)).toEqual({ status: 'invalid' });
  });

  it('refuses a code that was already used, and any older one', () => {
    const code = totpCode(rfcSecret, step);
    expect(checkTotp(rfcSecret, code, now, step)).toEqual({ status: 'replayed' });
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step - 1), now, step)).toEqual({
      status: 'replayed',
    });
    // A newer step is fine.
    expect(checkTotp(rfcSecret, totpCode(rfcSecret, step + 1), now, step)).toEqual({
      status: 'ok',
      step: step + 1,
    });
  });

  it('refuses codes that are not six digits, or are wrong', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 3456', '000000x']) {
      expect(checkTotp(rfcSecret, bad, now, null).status).toBe('invalid');
    }
    const right = totpCode(rfcSecret, step);
    const wrong = right === '000000' ? '000001' : '000000';
    expect(
      [wrong].every((code) => checkTotp(rfcSecret, code, now, null).status === 'invalid'),
    ).toBe(true);
  });
});

describe('secrets', () => {
  it('are at least 160 bits and different each time', () => {
    const first = generateTotpSecret();
    expect(first).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(first)?.length).toBe(20);
    expect(generateTotpSecret()).not.toBe(first);
  });

  it('round-trip through base32, ignoring spaces and case', () => {
    const secret = generateTotpSecret();
    expect(base32Decode(groupSecret(secret).toLowerCase())?.toString('hex')).toBe(
      base32Decode(secret)?.toString('hex'),
    );
    expect(base32Decode('not base32!')).toBeUndefined();
  });

  it('are shown in groups of four letters', () => {
    expect(groupSecret('ABCDEFGHIJKL')).toBe('ABCD EFGH IJKL');
  });
});

describe('the QR code', () => {
  const uri = otpauthUri({
    secret: 'JBSWY3DPEHPK3PXP',
    account: 'ada@example.test',
    issuer: 'Christophe Art',
  });

  it('describes the account for the authenticator app', () => {
    expect(uri).toBe(
      'otpauth://totp/Christophe%20Art:ada%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=Christophe+Art&algorithm=SHA1&digits=6&period=30',
    );
  });

  it('is drawn on the server as inline SVG, with no outside address', () => {
    const svg = qrSvg(uri, 'Code QR');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).not.toMatch(/<image|<script|href=/);
    expect(svg.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:/);
  });
});
