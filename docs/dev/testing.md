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

`pnpm test:e2e` builds the site, starts it on port 4322 with a throwaway database, and runs the tests on a desktop and a phone viewport. First time on a machine: `pnpm exec playwright install chromium` (on Linux add `--with-deps` to install the system libraries; it needs administrator rights).

The server keeps its PGlite database in the folder `.e2e-db` (deleted at each run) instead of memory, so that the admin accounts the tests need can be created first with `pnpm admin:create`, the same command as in production (list in `e2e/admin-accounts.ts`). The per-IP login limit is raised for the run, because every test comes from the same address.

### Admin checks

- `src/server/admin/*.int.test.ts`: accounts, login (same message and same time whether the account exists or not, limits per account and per IP), sessions (token, idle and maximum lifetime, revocation), activity log paging, and `routes.int.test.ts`, which **lists the files of `src/pages/admin/` itself** and checks that every route refuses a visitor without a session, that every change needs the right `Origin`, and that encoded paths do not slip past the guard. A new admin page is covered without editing the test.
- `e2e/admin.spec.ts` (desktop and phone, in a browser): first login with a temporary password, account creation, disable and re-enable, reset, login limit, logout, no sideways scrolling. `e2e/admin-http.spec.ts` runs the same flows over plain HTTP, and the "admin security" part of `admin.spec.ts` checks the cookie flags, `X-Robots-Tag` and `robots.txt`. A request made with Playwright's `request` helper must send `Origin` and `Sec-Fetch-Site: same-origin` like a browser does.

### Design checks

- `src/styles/design.test.ts` (unit) checks WCAG AA contrast of the text/background token pairs, that no raw colour value appears outside `src/styles/tokens.css`, that every token used is defined, and that the fonts are self-hosted with their licences.
- `e2e/design.spec.ts` checks the header and footer, the 360 px layout, keyboard focus, reduced motion, the hexagon pattern placement, that no request leaves the site, and takes a full-page screenshot of the showcase page `/dev/design` (served only when `DEV_PAGES=true`, which the e2e server sets).

The screenshot is compared with a baseline in `e2e/design.spec.ts-snapshots/` when one is committed. Without a baseline it is only taken and attached to the test report. To create or refresh the baselines, run `pnpm test:e2e --update-snapshots` on Linux (the CI image, or the `e2e-results` artifact of the CI run) and commit the PNG files. Review them by eye before committing.

## Rules

- New behaviour needs tests; a bug fix starts with a failing regression test.
- Never weaken or delete a test to make CI pass.
- A test must not depend on another test file's data.
