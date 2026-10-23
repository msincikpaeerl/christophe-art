// Production entry point: validate the configuration, apply the migrations, then start the web server.
import { ConfigError, loadConfig } from './config.ts';
import { getDatabase } from './database.ts';
import { createLogger } from './logger.ts';

let config;
try {
  config = loadConfig();
} catch (error) {
  // No logger yet: the level itself comes from the configuration.
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}

const logger = createLogger(config.LOG_LEVEL);

try {
  const database = await getDatabase(config);
  await database.migrate();
  logger.info('database migrations applied');
} catch (error) {
  logger.fatal({ err: error }, 'cannot prepare the database');
  process.exit(1);
}

// The Astro Node adapter reads HOST and PORT when its entry is loaded.
process.env['HOST'] = config.HOST;
process.env['PORT'] = String(config.PORT);
// The path sits in a variable because the file only exists after `pnpm build`.
const serverEntry = '../../dist/server/entry.mjs';
await import(serverEntry);
