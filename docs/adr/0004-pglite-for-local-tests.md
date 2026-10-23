# 0004 — PGlite for local tests

- Status: accepted
- Date: 2026-10-24

## Context

Agents cannot run Docker on their machine, yet integration tests need a PostgreSQL database. The tests must still prove that the code works on a real PostgreSQL.

## Decision

Integration tests (`*.int.test.ts`) use PGlite, the PostgreSQL engine compiled to run inside Node, by default. When `DATABASE_URL` is set, the same tests run against that PostgreSQL server instead. Each test file gets its own clean database (a new PGlite instance, or a new database created on the server and dropped afterwards), through `src/test-support/database.ts`. CI runs the suite in both modes. The application also accepts `DATABASE_URL=pglite://memory` outside production, used by the end-to-end tests. PGlite is a development dependency and is not in the Docker image.

## Alternatives considered

- **Testcontainers**: real PostgreSQL, but needs Docker.
- **A shared local PostgreSQL**: needs installation and clean-up, and tests could disturb each other.
- **SQLite for tests**: a different SQL dialect would hide real bugs.
- **Mocking the database**: fast, but proves nothing about queries and migrations.

## Consequences

- Tests run anywhere Node runs, in a few seconds.
- A feature that works on PGlite but not on PostgreSQL (extensions, for instance) is caught by the PostgreSQL CI job; avoid PostgreSQL features PGlite lacks, or ask for a decision.
