# Setup

How to run Christophe Art on your machine. Choices are explained in [`docs/adr/`](../adr/0002-web-framework-astro.md).

## Requirements

- Node 24.21.0 (`.nvmrc`; with nvm, run `nvm use`).
- pnpm 12.15.0 (`npm install --global pnpm@12.15.0`). It is the version named in `package.json`.
- Docker is only needed to run the production stack. Tests and development do not need it.

## First start

```
pnpm install
cp .env.example .env
```

Edit `.env`. `DATABASE_URL` is the only required variable. Without a PostgreSQL server, use `DATABASE_URL=pglite://memory`: an in-memory database that is empty at each start (refused when `NODE_ENV=production`).

Then:

```
pnpm db:migrate   # applies the migrations to the database named by DATABASE_URL
pnpm dev          # development server with reload
```

For a production-like run without Docker: `pnpm build`, then `pnpm start`. `pnpm start` validates the configuration, applies the migrations, and starts the server.

## Environment variables

Listed with comments in [`.env.example`](../../.env.example). They are validated by `src/server/config.ts` at start. When one is missing or invalid, the application stops and names it, for example `DATABASE_URL: is required but missing`. Never commit a `.env` file.

## Database migrations

The schema is `src/server/schema.ts`. After changing it, run `pnpm db:generate`, review the new SQL file in `drizzle/`, and commit it. Never edit a migration that is already committed. The application applies pending migrations every time it starts.

## Run the stack in Docker

```
cp .env.example .env     # then set POSTGRES_PASSWORD and ADMIN_ENCRYPTION_KEY
docker compose up --build --detach --wait
curl http://localhost:4321/health
docker compose down
```

`compose.yml` starts PostgreSQL and the application. The application starts only once the database reports healthy, restarts unless stopped, and keeps data in the named volumes `db-data` (database) and `uploads` (uploaded images). The image is built from the multi-stage [`Dockerfile`](../../Dockerfile): production dependencies only, a non-root user, and a health check on `/health`. Agents cannot run Docker; CI builds the image and runs this smoke test.

## Admin accounts

The admin area (`/admin`) has no sign-up: the first account is created on the server.

```
pnpm admin:create --email you@example.com --name "Your Name"
```

The command applies the migrations if needed, creates the account and prints a **temporary password, once**. The account must change it at its first login ([Se connecter](../user/se-connecter.md)). `--temporary-password <password>` sets a chosen one instead (it must follow the password rules, and it ends up in your shell history). The login email is only an identifier: the site never sends email.

To reset a password when nobody can sign in, or from the server in general:

```
pnpm admin:reset-password --email you@example.com
```

It ends the account's sessions, prints a new temporary password once, and requires a change at the next login. Both commands write to the activity log as "Commande serveur".

In the Docker stack, the commands run inside the application container, which keeps pnpm for that purpose and already has the database settings:

```
docker compose exec app pnpm admin:create --email you@example.com --name "Your Name"
docker compose exec app pnpm admin:reset-password --email you@example.com
```

Login limits, session durations and the proxy setting are environment variables (`ADMIN_LOGIN_MAX_FAILURES_PER_ACCOUNT`, `ADMIN_LOGIN_MAX_FAILURES_PER_IP`, `ADMIN_LOGIN_WINDOW_MINUTES`, `ADMIN_SESSION_IDLE_MINUTES`, `ADMIN_SESSION_MAX_HOURS`, `TRUST_PROXY`), described in `.env.example`. Behind a reverse proxy set `SITE_URL` to the public address (the admin compares the `Origin` header with it) and `TRUST_PROXY=true`. The design is in [ADR 0011](../adr/0011-admin-accounts-sessions-and-passwords.md).

### Second factor

Every admin account must have a second factor (authenticator app codes, with recovery codes; see [ADR 0012](../adr/0012-second-factor-totp.md)).

- **`ADMIN_ENCRYPTION_KEY` is required.** It encrypts the authenticator secrets in the database and keys the recovery code hashes. The application refuses to start without it. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`, keep it in your secret store and back it up: if it is lost, every second factor must be set up again (the accounts keep their passwords), and changing it has the same effect. In Docker, put it in the `.env` file next to `compose.yml`.
- **The server clock must be synchronised (NTP).** Codes depend on the time: one step (30 seconds) of drift is accepted either way, and a clock that is further off makes every code fail. Check that the host runs an NTP client (`timedatectl status` should say `System clock synchronized: yes`); containers use the host's clock. Also tell admins that their phone must be on automatic time.
- `ADMIN_CODE_MAX_FAILURES` (default 5) wrong codes lock the account for `ADMIN_CODE_LOCK_MINUTES` (default 15). `ADMIN_CODE_STEP_MINUTES` (default 5) is how long the code step stays open after the password.
- A new account has no second factor: its first login leads to the setup screen, the only page it can reach. Another admin can reset a second factor from the accounts list. When nobody can sign in, create a new account with `pnpm admin:create`; it sets up its own second factor at its first login.
- `pnpm admin:create … --totp-secret <base32 key>` installs a known secret on the new account. It exists to prepare the end-to-end test accounts; do not use it for real accounts, as the key would sit in your shell history.

## Dependencies

Versions are pinned exactly and `pnpm-lock.yaml` is committed. Before adding or upgrading a package, check `npm view <package> version`, install with `pnpm add --save-exact`, and commit the lock file. `pnpm audit --audit-level high` must pass.

## Documentation link check

`pnpm docs:links` checks that every relative link in the Markdown files points to an existing file and heading. It is part of `pnpm verify`.
