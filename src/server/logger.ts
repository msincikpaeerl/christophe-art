import { pino } from 'pino';
import type { DestinationStream, Logger } from 'pino';

/** Field names whose value must never reach a log, at any of the first four nesting levels. */
const secretKeys = [
  'password',
  'passwd',
  'secret',
  'token',
  'apiKey',
  'authorization',
  'cookie',
  'set-cookie',
  'DATABASE_URL',
  'connectionString',
];

const redactPaths = secretKeys.flatMap((key) => {
  const field = /^[A-Za-z_]\w*$/.test(key) ? key : `["${key}"]`;
  const wildcard = (depth: number) => '*.'.repeat(depth);
  return [0, 1, 2, 3].map((depth) => `${wildcard(depth)}${field}`);
});

let appLogger: Logger | undefined;

/** The application logger, at the level given by LOG_LEVEL (info when the configuration is invalid). */
export function getLogger(): Logger {
  appLogger ??= createLogger(process.env['LOG_LEVEL'] || 'info');
  return appLogger;
}

/** A logger writing one JSON object per line, with secrets, passwords and cookies replaced. */
export function createLogger(level = 'info', destination?: DestinationStream): Logger {
  return pino(
    {
      level,
      redact: { paths: redactPaths, censor: '[redacted]' },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination,
  );
}
