# 0002 — Web framework: Astro with its Node adapter

- Status: accepted
- Date: 2026-10-24

## Context

The site is a custom, server-rendered website: public pages must be indexable by search engines, and an admin area is added later. It is written in TypeScript and runs in Docker.

## Decision

Use Astro 7 in server mode (`output: 'server'`) with the `@astrojs/node` adapter in standalone mode. Pages are `.astro` files, API endpoints are `.ts` files in `src/pages/`. Business code lives in `src/server/` as plain TypeScript, so it can be tested without the framework.

## Alternatives considered

- **Next.js**: powerful, but React-centred and heavier than a mostly content-driven site needs; more moving parts to keep up to date.
- **Nuxt / SvelteKit**: good server rendering, but a bigger client framework model than the site needs.
- **Express/Fastify with a template engine**: minimal, but routing, assets, layouts and dev tooling would all be hand-built.
- **Static site generator**: public pages could not be edited from an admin area without rebuilds.

## Consequences

- Pages ship almost no JavaScript by default, which is good for speed and indexing.
- The production server is a single Node process (`dist/server/entry.mjs`), started by `src/server/start.ts`.
- Astro's tooling needs TypeScript 6 for now (see [0009](0009-typescript-and-tooling.md)).
