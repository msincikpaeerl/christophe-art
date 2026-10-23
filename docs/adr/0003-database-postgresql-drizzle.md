# 0003 — Database and migrations: PostgreSQL with Drizzle

- Status: accepted
- Date: 2026-10-24

## Context

The site stores its content in a relational database. Uploaded images stay on disk. The schema will change over time, so changes must be versioned and applied automatically.

## Decision

Use PostgreSQL (image pinned in `compose.yml`) through Drizzle ORM (`drizzle-orm` with the `pg` driver). The schema is written in `src/server/schema.ts`; `drizzle-kit generate` produces SQL migrations in `drizzle/`, which are committed. The application applies pending migrations at every start, before it listens.

## Alternatives considered

- **SQLite**: simplest to run, but weaker concurrency and a different engine from the one wanted in production.
- **Prisma**: mature, but needs a generated client and a heavier engine; harder to run unchanged against PGlite.
- **Kysely + a separate migration tool**: flexible, but two tools to align instead of one.
- **Hand-written SQL migrations**: fully transparent, but easy to get out of step with the code's types.

## Consequences

- Never edit a committed migration: change the schema and generate a new one.
- A broken migration stops the start-up and is logged, rather than leaving a half-migrated site running.
- Drizzle works with both `pg` and PGlite, which makes [0004](0004-pglite-for-local-tests.md) possible.
