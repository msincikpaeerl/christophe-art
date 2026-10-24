// Commands run on the server: `pnpm admin:create` and `pnpm admin:reset-password`.
// They share this file: the first argument is the command name.
import { parseArgs } from 'node:util';
import { createAccount, findAccountByEmail, resetPassword } from './admin/accounts.ts';
import { serverActor } from './admin/activity.ts';
import { installTotpSecret } from './admin/second-factor.ts';
import { adminSettings } from './admin/settings.ts';
import { base32Decode } from './admin/totp.ts';
import { ConfigError, loadConfig } from './config.ts';
import { openDatabase } from './database.ts';

const usage = {
  create:
    'Usage: pnpm admin:create --email <login email> --name "<display name>" [--temporary-password <password>] [--totp-secret <base32 key>]',
  'reset-password': 'Usage: pnpm admin:reset-password --email <login email>',
};

const errorTexts: Record<string, string> = {
  invalid_name: 'The display name is empty or longer than 80 characters.',
  invalid_email: 'The login email is not a valid address.',
  email_taken: 'An account already uses this login email.',
  not_found: 'No account has this login email.',
  too_short: 'The temporary password is shorter than 12 characters.',
  too_long: 'The temporary password is longer than 128 characters.',
  too_common: 'The temporary password is too common.',
};

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command !== 'create' && command !== 'reset-password') {
    throw new Error(`Unknown command. ${usage.create}\n${usage['reset-password']}`);
  }
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      'temporary-password': { type: 'string' },
      'totp-secret': { type: 'string' },
    },
  });
  const email = values.email;
  if (!email || (command === 'create' && !values.name)) throw new Error(usage[command]);

  const config = loadConfig();
  const totpSecret = values['totp-secret'];
  if (totpSecret !== undefined && (command !== 'create' || !base32Decode(totpSecret))) {
    throw new Error(usage[command]);
  }
  const database = await openDatabase(config.DATABASE_URL);
  try {
    await database.migrate();
    const actor = { name: serverActor, ip: 'server' };
    if (command === 'create') {
      const result = await createAccount(database.db, {
        displayName: values.name ?? '',
        email,
        actor,
        ...(values['temporary-password'] === undefined
          ? {}
          : { temporaryPassword: values['temporary-password'] }),
      });
      if (!result.ok) throw new Error(errorTexts[result.error] ?? result.error);
      if (totpSecret !== undefined) {
        await installTotpSecret(database.db, adminSettings(config), result.account.id, totpSecret);
        console.log('The authenticator secret was installed (second factor already set up).');
      }
      console.log(`Account created for ${result.account.email}.`);
      console.log(`Temporary password (shown once): ${result.temporaryPassword}`);
      console.log('It must be changed at the first login.');
    } else {
      const account = await findAccountByEmail(database.db, email);
      if (!account) throw new Error(errorTexts['not_found'] ?? 'not_found');
      const result = await resetPassword(database.db, account.id, actor);
      if (!result.ok) throw new Error(errorTexts[result.error] ?? result.error);
      console.log(`Password reset for ${account.email}; its sessions were ended.`);
      console.log(`Temporary password (shown once): ${result.temporaryPassword}`);
      console.log('It must be changed at the next login.');
    }
  } finally {
    await database.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(
    error instanceof ConfigError || error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
