# 0011 — Admin accounts, sessions and password hashing

- Status: accepted
- Date: 2026-10-24

## Context

Several people manage the site from `/admin`, and every account has the same rights. The site never sends email, so there is no "forgotten password" mail: another admin or a server command resets a password. A second factor becomes mandatory in a later ticket, and it must not require redesigning sessions.

## Decision

**Passwords.** 12 to 128 characters, refused when they appear in the bundled list of common passwords (`src/server/admin/common-passwords.ts`, compared in lower case). They are hashed with **Argon2id**, using Node's built-in `crypto.argon2` (no new dependency), with the OWASP-recommended parameters `m=19456` (19 MiB), `t=2`, `p=1`, a random 16-byte salt and a 32-byte tag. The hash is stored as a PHC string (`$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`), so the parameters travel with each hash and can be raised later without breaking old hashes. Temporary passwords are 16 random characters (about 93 bits) from an alphabet without look-alike characters.

**Login.** One message for every failure ("Email ou mot de passe incorrect"). A password check is always run: when the email is unknown, a check against a dummy hash with the same parameters burns the same time. Failures are counted per login email (typed, even if unknown, so the limit does not reveal accounts) and per IP address inside a window; the limit message says when to try again. Limits and window are environment settings.

**Sessions.** The cookie holds a random 256-bit token (`crypto.randomBytes(32)`); only its SHA-256 hash is stored (the token is already high-entropy, so a fast hash is enough). The cookie is `HttpOnly; Secure; SameSite=Strict; Path=/admin`. Every login creates a new token. A session ends after an idle timeout or a maximum lifetime (both settings), when its account is disabled, or when it is revoked. Each session records the **factors** verified (`password` today): a second factor adds to that list and a later ticket can require it without changing the tables.

**Requests.** A framework-free guard (`src/server/admin/guard.ts`), called by `src/middleware.ts` before any admin page, applies three rules: a request that changes something must carry an `Origin` equal to the site's address (`SITE_URL`, or the request's own); every page except the login page needs a valid session; an account with a temporary password reaches only the password change and the logout. Paths are decoded and normalised before they are compared, and an undecodable path counts as admin, so no encoding tricks bypass the guard. Admin answers carry `X-Robots-Tag: noindex` and `Cache-Control: no-store`, and `robots.txt` disallows `/admin`.

**Client address.** The socket address, or, with `TRUST_PROXY=true`, the last `X-Forwarded-For` entry (the one added by the trusted proxy).

**Server commands.** `pnpm admin:create` and `pnpm admin:reset-password` run `src/server/admin-cli.ts`. The production image keeps pnpm so they work with `docker compose exec app pnpm …`.

## Alternatives considered

- **bcrypt or scrypt**: older or less recommended than Argon2id; `crypto.argon2` is built into Node 24, which avoids a native dependency.
- **A library such as `argon2` (native) or `@node-rs/argon2`**: extra native binaries to build in Alpine images, for no gain over the built-in.
- **Signed stateless tokens (JWT)**: cannot be revoked at once, which the ticket requires (disable and password change end sessions immediately).
- **A session table keyed by the raw token**: a database leak would give working sessions; hashing the token avoids that.
- **Per-IP limits only**: a botnet gets around them; per-account limits only: one address can try many accounts. Both are used.

## Consequences

- Each login costs about 20–50 ms and 19 MiB of memory for the hash; the failure path costs the same.
- Locking by login email lets someone lock a known account out for one window by failing logins on purpose. The limit is temporary and another admin or the server command can still act; this is accepted for a small private admin.
- Behind a reverse proxy, `TRUST_PROXY=true` and `SITE_URL` must be set, otherwise the IP limit sees the proxy's address and the Origin check compares with an internal address.
- Changing the Argon2 parameters later only affects new hashes; a rehash-on-login step can be added when needed.
- Astro's own cross-site form check stays enabled; the admin check is stricter (it also covers requests without a form content type).
