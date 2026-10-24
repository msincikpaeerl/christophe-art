# Architecture

Components of Christophe Art and how they fit together. Decisions are in [`docs/adr/`](../adr/0001-record-architecture-decisions.md).

```
browser ──► Astro server (Node, src/pages) ──► PostgreSQL (Drizzle)
                      │
                      └──► uploaded images on disk (UPLOADS_DIR, a Docker volume)
```

- **Web server**: [Astro in server mode](../adr/0002-web-framework-astro.md). Pages and endpoints are in `src/pages/`.
- **Look and feel**: [design tokens as CSS custom properties](../adr/0010-design-tokens-css-custom-properties.md) in `src/styles/tokens.css`, base styles in `src/styles/global.css`, components in `src/components/`, page frame in `src/layouts/BaseLayout.astro`, self-hosted fonts in `public/fonts/`. The rules are in [the design system](../design.md). The showcase page `/dev/design` is served only when `DEV_PAGES=true`.
- **Languages**: the public site is bilingual (`/fr/...`, `/en/...`); routes, dictionaries and formatting are in `src/i18n/`. See [Languages](i18n.md).
- **Server code**: plain TypeScript in `src/server/`, independent of the framework: configuration (`config.ts`), database (`database.ts`, `schema.ts`), health check (`health.ts`), logging (`logger.ts`), and the start-up scripts (`start.ts`, `migrate-cli.ts`).
- **Start-up** (`src/server/start.ts`): validate the environment, apply the database migrations, then load the built Astro server.
- **Admin area**: pages in `src/pages/admin/` (French addresses), layout `src/layouts/AdminLayout.astro`, French texts in `src/admin/messages.ts`, logic in `src/server/admin/` (passwords, accounts, sessions, login limits, activity log, request guard). `src/middleware.ts` runs the guard on every `/admin` request: `Origin` check on anything that changes data, session required except on `/admin/connexion`, an account without a second factor limited to its setup, a session that has not typed its code limited to the code step, temporary passwords limited to the password change, `X-Robots-Tag: noindex`. The second factor (TOTP and recovery codes) is in `second-factor.ts`, `totp.ts` and `secret-box.ts` ([ADR 0012](../adr/0012-second-factor-totp.md)). Details in [ADR 0011](../adr/0011-admin-accounts-sessions-and-passwords.md). To add an admin page, create it under `src/pages/admin/`: it is protected by default, and the tests list the folder to check it. Interface texts go in `src/admin/messages.ts`.
- **Database**: [PostgreSQL through Drizzle](../adr/0003-database-postgresql-drizzle.md); migrations in `drizzle/`.
- **Health**: `GET /health` answers 200 `{"status":"ok"}` when the database answers, and 503 otherwise.
- **Logs**: [JSON lines from Pino](../adr/0007-logging-pino.md), secrets redacted.
