# Architecture

Components of Christophe Art and how they fit together. Decisions are in [`docs/adr/`](../adr/0001-record-architecture-decisions.md).

```
browser ──► Astro server (Node, src/pages) ──► PostgreSQL (Drizzle)
                      │
                      └──► uploaded images on disk (UPLOADS_DIR, a Docker volume)
```

- **Web server**: [Astro in server mode](../adr/0002-web-framework-astro.md). Pages and endpoints are in `src/pages/`.
- **Look and feel**: [design tokens as CSS custom properties](../adr/0010-design-tokens-css-custom-properties.md) in `src/styles/tokens.css`, base styles in `src/styles/global.css`, components in `src/components/`, page frame in `src/layouts/BaseLayout.astro`, self-hosted fonts in `public/fonts/`. The rules are in [the design system](../design.md). The showcase page `/dev/design` is served only when `DEV_PAGES=true`.
- **Server code**: plain TypeScript in `src/server/`, independent of the framework: configuration (`config.ts`), database (`database.ts`, `schema.ts`), health check (`health.ts`), logging (`logger.ts`), and the start-up scripts (`start.ts`, `migrate-cli.ts`).
- **Start-up** (`src/server/start.ts`): validate the environment, apply the database migrations, then load the built Astro server.
- **Database**: [PostgreSQL through Drizzle](../adr/0003-database-postgresql-drizzle.md); migrations in `drizzle/`.
- **Health**: `GET /health` answers 200 `{"status":"ok"}` when the database answers, and 503 otherwise.
- **Logs**: [JSON lines from Pino](../adr/0007-logging-pino.md), secrets redacted.
