# CLAUDE.md — Christophe Art

Instructions for Claude Code working on this repository. Keep this file under 150 lines.
Details belong in `docs/`; this file only points to them.

## What this project is

A custom server-rendered website (public pages must be indexable) with an admin area. TypeScript, Astro (Node adapter), PostgreSQL through Drizzle, uploaded images on disk, run in Docker in production. Agents cannot run Docker: every test runs locally without it (PGlite stands in for PostgreSQL).

## Current state

Foundation, visual identity and bilingual routing (`/fr/...`, `/en/...`). Public pages are placeholders, plus `GET /health`. Interface texts always go through `src/i18n/` dictionaries. The admin area (`/admin`, French only, texts in `src/admin/messages.ts`) has accounts, password login, sessions and an activity log; every page under `src/pages/admin/` is protected by `src/middleware.ts` by default (see `docs/dev/architecture.md`, ADR 0011).

## Read before working

1. The ticket you were given.
2. The documentation of the area you touch in `docs/dev/`.
3. The decisions in `docs/adr/` related to that area.

## Commands

Package manager: pnpm (`npm install --global pnpm@12.15.0`), Node 24.21.0 (`.nvmrc`).

| Task                                       | Command                                           |
| ------------------------------------------ | ------------------------------------------------- |
| Install                                    | `pnpm install`                                    |
| Everything CI's verify job runs            | `pnpm verify`                                     |
| Lint (ESLint, strict, type-aware)          | `pnpm lint`                                       |
| Format check / format                      | `pnpm format:check` / `pnpm format`               |
| Type check (strict TypeScript)             | `pnpm typecheck`                                  |
| Unit + integration tests (PGlite)          | `pnpm test`                                       |
| Unit tests only                            | `pnpm test:unit`                                  |
| Integration tests only                     | `pnpm test:integration`                           |
| Integration tests on a real PostgreSQL     | `DATABASE_URL=postgres://… pnpm test:integration` |
| End-to-end tests (Playwright)              | `pnpm test:e2e`                                   |
| Documentation link check                   | `pnpm docs:links`                                 |
| Build                                      | `pnpm build`                                      |
| Generate a migration after a schema change | `pnpm db:generate`                                |
| Apply migrations                           | `pnpm db:migrate`                                 |
| Create an admin account (server command)   | `pnpm admin:create --email … --name "…"`          |
| Reset an admin password (server command)   | `pnpm admin:reset-password --email …`             |
| Dev server (agents never start it)         | `pnpm dev`                                        |
| Start the built site                       | `pnpm start`                                      |
| Security audit (fails on high/critical)    | `pnpm audit --audit-level high`                   |
| Docker stack (CI only for agents)          | `docker compose up --build --detach --wait`       |

## Repository map

```
src/pages/        Astro pages and endpoints (index.ts redirect, [lang]/ public pages, health.ts)
src/i18n/         Languages: route table, dictionaries (fr/en), formatting; see docs/dev/i18n.md
src/styles/       Design tokens (tokens.css, the only place for raw values) and base styles
src/components/   Header, footer and other Astro components; src/layouts/ holds the page frame
public/fonts/     Self-hosted fonts with their licences
src/server/       Framework-free server code: config, database, schema, health, logger, start scripts
src/server/admin/ Admin logic: passwords, accounts, sessions, login limits, activity log, request guard
src/admin/        French interface texts of the admin; src/middleware.ts guards every /admin request
src/test-support/ Test helpers (createTestDatabase: PGlite or real PostgreSQL)
drizzle/          Generated, committed SQL migrations
e2e/              Playwright tests (desktop and phone)
Dockerfile        Multi-stage production image
compose.yml       App + PostgreSQL, named volumes
.env.example      Every environment variable, commented
docs/user/        User documentation, organised by tasks
docs/dev/         Developer documentation (architecture, setup, testing)
docs/adr/         Architecture Decision Records
.github/          CI (jobs: verify, audit, integration-postgres, e2e, docker, ci)
```

## Conventions

- UI follows `docs/design.md`: use `var(--token)` from `src/styles/tokens.css`, never a raw colour (a test fails). Add new components to `/dev/design`.
- Commits follow Conventional Commits with the ticket number: `feat(WEB-12): add contact form`.
- Every significant technical choice gets an ADR: copy `docs/adr/0000-template.md`, next number.
- A user-visible change updates `docs/user/` and `CHANGELOG.md` in the same pull request.
- CI: every job in `.github/workflows/ci.yml` is listed in the `needs` of the final `ci` job. Never rename or remove `ci`: branch protection requires it, and no pull request can be merged without it.
- All text in English.
- Dependencies: exact versions (`pnpm add --save-exact`), checked with `npm view`; commit `pnpm-lock.yaml`.
- Configuration only through `src/server/config.ts` (Zod schema); add each new variable to `.env.example` with a comment.
- Code in `src/server/` is run by Node directly (type stripping): import with the `.ts` extension, use `import type`, no enums, no imports from outside `src/server/`.
- No `any` without an `eslint-disable-next-line … -- reason` comment.
- Logs go through `src/server/logger.ts`; never log a secret, password or cookie, nor the whole config.
- Schema changes: edit `src/server/schema.ts`, run `pnpm db:generate`, commit the migration; never edit a committed migration.

## Tests

- New behaviour needs tests: unit `*.test.ts` and integration `*.int.test.ts` next to the code, e2e in `e2e/`.
- Integration tests get a clean database from `createTestDatabase()` and must pass with PGlite and with PostgreSQL.
- A bug fix starts with a regression test that fails before the fix.
- Never weaken or delete a test to make CI pass: fix the code, or explain in the pull request why the test was wrong.
- Details: `docs/dev/testing.md`. Setup and Docker: `docs/dev/setup.md`.

## Before finishing

`pnpm verify` must pass, and `pnpm test:e2e` when pages change (if a browser is available).

## Never

- Never commit secrets. Environment variables are listed in `.env.example`.
- Never commit to the default branch: work on the ticket branch.
