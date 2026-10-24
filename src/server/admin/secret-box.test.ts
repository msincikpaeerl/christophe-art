import { describe, expect, it } from 'vitest';
import { decryptText, encryptText, keyedHash } from './secret-box.ts';

const key = Buffer.alloc(32, 1);

describe('encryptText', () => {
  it('round-trips and never shows the text', () => {
    const stored = encryptText('JBSWY3DPEHPK3PXP', key);
    expect(stored).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptText(stored, key)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('gives a different result each time', () => {
    expect(encryptText('same', key)).not.toBe(encryptText('same', key));
  });

  it('refuses a wrong key and an altered text', () => {
    const stored = encryptText('secret', key);
    expect(() => decryptText(stored, Buffer.alloc(32, 2))).toThrow();
    const [version, iv, tag, data] = stored.split('.');
    const altered = [version, iv, tag, `A${(data ?? '').slice(1)}`].join('.');
    expect(() => decryptText(altered, key)).toThrow();
    expect(() => decryptText('nonsense', key)).toThrow();
  });
});

describe('keyedHash', () => {
  it('depends on the key and the text', () => {
    expect(keyedHash('code', key)).toBe(keyedHash('code', key));
    expect(keyedHash('code', key)).not.toBe(keyedHash('code', Buffer.alloc(32, 2)));
    expect(keyedHash('code', key)).not.toBe(keyedHash('other', key));
    expect(keyedHash('code', key)).toMatch(/^[0-9a-f]{64}$/);
  });
});
