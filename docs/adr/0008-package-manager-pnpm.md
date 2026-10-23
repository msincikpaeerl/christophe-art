# 0008 — Package manager: pnpm

- Status: accepted
- Date: 2026-10-24

## Context

Dependencies must install the same way on every machine and in CI, quickly, and without packages that were never declared.

## Decision

Use pnpm. The version is pinned in `package.json` (`packageManager`) and activated with Corepack (`corepack enable`). Dependency versions are pinned exactly (no `^` or `~`), the lock file `pnpm-lock.yaml` is committed, and CI installs with `--frozen-lockfile`. The Node version is pinned in `.nvmrc` and `engines`. `pnpm audit --audit-level high` runs in CI.

## Alternatives considered

- **npm**: no extra tool, but slower and its flat `node_modules` lets code import undeclared packages.
- **Yarn**: comparable to pnpm, with a larger set of configuration modes to keep consistent.

## Consequences

- Updating a dependency is a deliberate change: new exact version, new lock file.
- pnpm refuses to run install scripts unless allowed in `pnpm-workspace.yaml` (only `esbuild` is).
