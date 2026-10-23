# 0007 — Logging: Pino

- Status: accepted
- Date: 2026-10-24

## Context

In production the logs are read by tools and by people looking for a problem. They must be structured, and must never contain a secret, a password or a cookie value.

## Decision

Use Pino, writing one JSON object per line on standard output (Docker collects it). `src/server/logger.ts` redacts the fields `password`, `secret`, `token`, `authorization`, `cookie`, `set-cookie`, `DATABASE_URL` and similar, up to four levels deep, and a test proves it. Code never logs the whole configuration or whole request headers.

## Alternatives considered

- **Winston**: flexible, but slower and not JSON-first.
- **`console.log`**: no levels, no structure, no redaction.
- **Bunyan**: similar idea, but no longer actively developed.

## Consequences

- A new secret-bearing field name must be added to the list in `logger.ts`, with a test.
- The log level is set with `LOG_LEVEL`.
