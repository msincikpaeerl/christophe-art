import { argon2, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { isCommonPassword } from './common-passwords.ts';

export const passwordMinLength = 12;
export const passwordMaxLength = 128;

/** Argon2id parameters (see docs/adr/0011-admin-accounts-sessions-and-passwords.md). */
export const argon2Parameters = {
  memory: 19456,
  passes: 2,
  parallelism: 1,
  tagLength: 32,
} as const;
const saltLength = 16;

export type PasswordProblem = 'too_short' | 'too_long' | 'too_common';

/** The first rule a new password breaks, or undefined when it is acceptable. */
export function passwordProblem(password: string): PasswordProblem | undefined {
  if (password.length < passwordMinLength) return 'too_short';
  if (password.length > passwordMaxLength) return 'too_long';
  if (isCommonPassword(password)) return 'too_common';
  return undefined;
}

function derive(
  password: string,
  salt: Buffer,
  parameters: { memory: number; passes: number; parallelism: number; tagLength: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2('argon2id', { message: password, nonce: salt, ...parameters }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Hashes a password with Argon2id. The result is a PHC string holding the parameters and salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const key = await derive(password, salt, argon2Parameters);
  const { memory, passes, parallelism } = argon2Parameters;
  return `$argon2id$v=19$m=${String(memory)},t=${String(passes)},p=${String(parallelism)}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

/** Checks a password against a PHC string produced by `hashPassword`. Never throws on a bad hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/.exec(hash);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, expected] = match;
  const expectedKey = Buffer.from(expected ?? '', 'base64url');
  if (expectedKey.length === 0) return false;
  try {
    const key = await derive(password, Buffer.from(salt ?? '', 'base64url'), {
      memory: Number(memory),
      passes: Number(passes),
      parallelism: Number(parallelism),
      tagLength: expectedKey.length,
    });
    return timingSafeEqual(key, expectedKey);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same time as a real check. Used when the login email is unknown, so that the answer
 * time does not tell whether an account exists.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHash);
  return false;
}

// No look-alike characters (0/O, 1/l/I): the password is read from a screen and typed.
const temporaryAlphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A random temporary password of 16 characters (about 93 bits), always acceptable by the policy. */
export function generateTemporaryPassword(): string {
  for (;;) {
    let password = '';
    for (let index = 0; index < 16; index++) {
      password += temporaryAlphabet.charAt(randomInt(temporaryAlphabet.length));
    }
    if (passwordProblem(password) === undefined) return password;
  }
}
