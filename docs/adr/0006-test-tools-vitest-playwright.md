# 0006 — Test tools: Vitest and Playwright

- Status: accepted
- Date: 2026-10-24

## Context

The project needs fast unit and integration tests in TypeScript, and end-to-end tests in a real browser on desktop and phone sizes.

## Decision

- **Vitest** for unit tests (`*.test.ts`) and integration tests (`*.int.test.ts`), written next to the code they test and split into two Vitest projects, `unit` and `integration`.
- **Playwright** for end-to-end tests in `e2e/`, with two projects (a desktop Chrome and a Pixel 7 phone). Playwright builds and starts the site itself, on its own port.

## Alternatives considered

- **Jest**: works, but needs extra set-up for modern TypeScript and ES modules; Vitest shares Astro's Vite pipeline.
- **Node's built-in test runner**: no dependency, but fewer features (watch mode, mocking, projects).
- **Cypress**: strong tooling, but heavier, and multi-browser and phone emulation are less direct than in Playwright.

## Consequences

- End-to-end tests need a browser: `pnpm exec playwright install chromium`, plus system libraries on Linux (`--with-deps`).
- Integration tests are described in [0004](0004-pglite-for-local-tests.md).
