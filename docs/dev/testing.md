# Testing

Test strategy and how to run each level. Tool choices: [Vitest and Playwright](../adr/0006-test-tools-vitest-playwright.md), [PGlite](../adr/0004-pglite-for-local-tests.md).

| Level               | Tool                  | Files                  | Command                 |
| ------------------- | --------------------- | ---------------------- | ----------------------- |
| Unit                | Vitest                | `src/**/*.test.ts`     | `pnpm test:unit`        |
| Integration         | Vitest + PGlite or PG | `src/**/*.int.test.ts` | `pnpm test:integration` |
| End to end          | Playwright            | `e2e/*.spec.ts`        | `pnpm test:e2e`         |
| Documentation links | remark-validate-links | all Markdown files     | `pnpm docs:links`       |
| All but end to end  |                       |                        | `pnpm verify`           |

Unit and integration tests sit next to the code they test. `pnpm test` runs both.

## Integration tests and PGlite

Integration tests need a database. PGlite is PostgreSQL running inside Node, so no Docker and no server are needed: this is the default.

When `DATABASE_URL` is set to a PostgreSQL server, the same tests run against it instead:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test:integration
```

Each test file asks `createTestDatabase()` (`src/test-support/database.ts`) for its own clean database: a new in-memory PGlite, or a new database created on the server (and dropped at the end). Call `migrate()` on it when the test needs the tables. CI runs the suite in both modes: the `verify` job with PGlite, the `integration-postgres` job against a PostgreSQL service container.

## End-to-end tests

`pnpm test:e2e` builds the site, starts it on port 4322 with an in-memory database, and runs the tests on a desktop and a phone viewport. First time on a machine: `pnpm exec playwright install chromium` (on Linux add `--with-deps` to install the system libraries; it needs administrator rights).

## Rules

- New behaviour needs tests; a bug fix starts with a failing regression test.
- Never weaken or delete a test to make CI pass.
- A test must not depend on another test file's data.
