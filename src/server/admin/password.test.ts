import { describe, expect, it } from 'vitest';
import { isCommonPassword } from './common-passwords.ts';
import {
  argon2Parameters,
  generateTemporaryPassword,
  hashPassword,
  passwordProblem,
  verifyPassword,
} from './password.ts';

describe('password policy', () => {
  it('refuses fewer than 12 characters', () => {
    expect(passwordProblem('a'.repeat(11))).toBe('too_short');
    expect(passwordProblem('Tr0ub4dor&3x')).toBeUndefined();
  });

  it('accepts exactly 12 and exactly 128 characters, and refuses 129', () => {
    expect(passwordProblem('kq7vXm2wLp9d')).toBeUndefined();
    expect(passwordProblem('kq7vXm2w'.repeat(16))).toBeUndefined();
    expect(passwordProblem('kq7vXm2w'.repeat(16) + 'x')).toBe('too_long');
  });

  it('refuses common passwords whatever their case', () => {
    expect(passwordProblem('password1234')).toBe('too_common');
    expect(passwordProblem('PassWord1234')).toBe('too_common');
    expect(passwordProblem('123456789012')).toBe('too_common');
    expect(passwordProblem('correcthorsebatterystaple')).toBe('too_common');
  });

  it('bundles a list of common passwords, all 12 characters or more', () => {
    expect(isCommonPassword('azertyuiop123')).toBe(true);
    expect(isCommonPassword('a-very-unusual-passphrase')).toBe(false);
  });
});

describe('hashing with Argon2id', () => {
  it('writes the parameters in the hash and verifies the right password only', async () => {
    const hash = await hashPassword('a-very-unusual-passphrase');
    const { memory, passes, parallelism } = argon2Parameters;
    expect(hash).toMatch(
      new RegExp(
        `^\\$argon2id\\$v=19\\$m=${String(memory)},t=${String(passes)},p=${String(parallelism)}\\$`,
      ),
    );
    expect(hash).not.toContain('unusual');
    expect(await verifyPassword('a-very-unusual-passphrase', hash)).toBe(true);
    expect(await verifyPassword('a-very-unusual-passphrasf', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same-password-1'),
      hashPassword('same-password-1'),
    ]);
    expect(first).not.toBe(second);
  });

  it('answers false, without throwing, to a malformed hash', async () => {
    expect(await verifyPassword('x', 'not a hash')).toBe(false);
    expect(await verifyPassword('x', '$argon2id$v=19$m=1,t=1,p=1$$')).toBe(false);
  });
});

describe('temporary passwords', () => {
  it('are random, 16 characters and acceptable by the policy', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTemporaryPassword()));
    expect(passwords.size).toBe(20);
    for (const password of passwords) {
      expect(password).toHaveLength(16);
      expect(passwordProblem(password)).toBeUndefined();
    }
  });
});
