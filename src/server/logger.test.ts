import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.ts';

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  return { lines, stream };
}

describe('createLogger', () => {
  it('writes one JSON object per line', () => {
    const { lines, stream } = capture();
    createLogger('info', stream).info({ route: '/health' }, 'hello');
    const entry = JSON.parse(lines.join('')) as Record<string, unknown>;
    expect(entry).toMatchObject({ msg: 'hello', route: '/health', level: 30 });
    expect(typeof entry['time']).toBe('string');
  });

  it('never logs a secret, a password or a cookie value', () => {
    const { lines, stream } = capture();
    const logger = createLogger('info', stream);
    logger.info(
      {
        password: 'hunter2-top',
        user: { password: 'hunter2-nested', token: 'tok-nested' },
        req: { headers: { cookie: 'session=cookie-value', authorization: 'Bearer bearer-value' } },
        res: { headers: { 'set-cookie': 'session=set-cookie-value' } },
        config: { DATABASE_URL: 'postgres://user:db-password@host/db' },
        deep: { a: { b: { secret: 'secret-deep' } } },
      },
      'login attempt',
    );
    const output = lines.join('');
    for (const value of [
      'hunter2-top',
      'hunter2-nested',
      'tok-nested',
      'cookie-value',
      'bearer-value',
      'set-cookie-value',
      'db-password',
      'secret-deep',
    ]) {
      expect(output).not.toContain(value);
    }
    expect(output).toContain('[redacted]');
    expect(output).toContain('login attempt');
  });
});
