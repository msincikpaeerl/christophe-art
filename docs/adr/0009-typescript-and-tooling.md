# 0009 — TypeScript 6, strict checks, and Node running TypeScript directly

- Status: accepted
- Date: 2026-10-24

## Context

The project is written in TypeScript with strict checks. The latest TypeScript release at the time (7.0) is not yet supported by `typescript-eslint` and `@astrojs/check`. The server start-up code (`src/server/`) must run in Docker without a separate compile step.

## Decision

- Pin TypeScript 6.0.3, the newest version the lint and Astro tools support. Move to 7 when they do.
- Use Astro's `strictest` tsconfig, `typescript-eslint` `strictTypeChecked`, and `no-explicit-any` as an error: an `any` is only allowed with an `eslint-disable-next-line … -- reason` comment.
- Node 24 runs the `.ts` files of `src/server/` directly (type stripping). Those files therefore import each other with the `.ts` extension, use `import type`, and avoid TypeScript-only syntax such as enums (`erasableSyntaxOnly`).
- Prettier formats everything, including Astro files.

## Alternatives considered

- **Compile the server with `tsc` or a bundler**: one more build output and path to keep right.
- **`tsx` at runtime**: an extra production dependency for something Node does itself.
- **TypeScript 7**: not supported by the tooling yet.

## Consequences

- The Docker image copies `src/server/` as it is.
- Code in `src/server/` must not import from other `src/` folders.
