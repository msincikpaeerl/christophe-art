// `pnpm db:migrate`: applies the migrations to the database named by DATABASE_URL, then exits.
import { ConfigError, loadConfig } from './config.ts';
import { openDatabase } from './database.ts';

try {
  const database = await openDatabase(loadConfig().DATABASE_URL);
  await database.migrate();
  await database.close();
  console.log('Migrations applied.');
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}
