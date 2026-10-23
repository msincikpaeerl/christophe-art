# 0005 — Validation: Zod

- Status: accepted
- Date: 2026-10-24

## Context

Everything that enters the application (environment variables now, forms and uploads later) must be checked before use, with clear error messages, and the checked data must be typed.

## Decision

Use Zod 4 for every schema. The environment is validated in `src/server/config.ts` when the application starts; it refuses to start and names each missing or invalid variable, without printing values.

## Alternatives considered

- **Valibot**: smaller, but a smaller ecosystem and less familiar to contributors.
- **ArkType**: fast and expressive, but younger.
- **Hand-written checks**: more code, inconsistent messages, no inferred types.
- **Astro's built-in `astro:env`**: tied to the framework and checks at build time rather than at server start.

## Consequences

- One validation library for the whole project; the schema is the single source of truth for the type.
