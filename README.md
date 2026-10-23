# Christophe Art

The website of Christophe Art: a public website that search engines can read, plus an admin area to manage its content. Pictures that are uploaded are stored on the server, and everything else is kept in a PostgreSQL database.

**Status:** foundation only. The site currently shows a placeholder home page; the real pages come in later tickets.

## Start it with Docker

You need [Docker](https://docs.docker.com/get-docker/) with Compose.

1. Copy `.env.example` to `.env` and set `POSTGRES_PASSWORD` to a password of your choice (letters and digits only).
2. Run `docker compose up --build --detach --wait`.
3. Open <http://localhost:4321>. The page <http://localhost:4321/health> answers `ok` when the site and its database work.
4. Stop with `docker compose down`. Your data stays in Docker volumes; add `--volumes` to erase it.

The database and the uploaded pictures live in two named Docker volumes, so they survive restarts and updates.

## Working on the code

See [setup](docs/dev/setup.md) and [testing](docs/dev/testing.md). The short version: `pnpm install`, then `pnpm verify`.

## Documentation

- User guide: [`docs/user/`](docs/user/index.md), starting with [Getting started](docs/user/getting-started.md).
- Development: [architecture](docs/dev/architecture.md), [setup](docs/dev/setup.md), [testing](docs/dev/testing.md), [decisions](docs/adr/0001-record-architecture-decisions.md).
- Instructions for agents: [`CLAUDE.md`](CLAUDE.md).
- Changes: [`CHANGELOG.md`](CHANGELOG.md).
