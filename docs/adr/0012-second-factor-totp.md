# 0012 — Second factor: authenticator app codes (TOTP) and recovery codes

- Status: accepted
- Date: 2026-10-24

## Context

A password alone must not open the admin. Every account needs a second factor, and passkeys will be added later as another way to satisfy the same rule. The site has no email, so recovery cannot rely on a message. Agents cannot run Docker or a real phone: the codes must be testable by computing them from the secret.

## Decision

**Codes.** TOTP as authenticator apps use it (RFC 6238): HMAC-SHA-1, 6 digits, 30-second steps, written with Node's `crypto` (no OTP library). One step of clock drift is accepted either way. The step of the last accepted code is stored on the account, and a code of that step or an older one is refused, so a code works once; the step is claimed with a conditional `UPDATE`, so two simultaneous requests with the same code cannot both pass.

**Secrets.** 20 random bytes (160 bits), shown as base32. They are stored encrypted with AES-256-GCM, with a key from `ADMIN_ENCRYPTION_KEY` (32 bytes, base64). The configuration refuses to load without a valid key, so the application does not start. A secret waits in a "pending" column until the admin types a valid code for it; only then does it become the account's secret.

**QR code.** Drawn on the server as inline SVG with `qrcode-generator` (MIT, no dependencies), so nothing is sent to an outside service and the secret never leaves the site. The key is also shown as text.

**Recovery codes.** 10 codes of 12 symbols (60 bits, no look-alike characters) are created at the first setup, shown once, and offered as a text file through a `data:` link (the browser builds the file; the server never serves them again). Only an HMAC-SHA-256 of each code, keyed with the encryption key, is stored: the codes are random, so a keyed fast hash is enough, and a stolen database alone gives nothing to test guesses against. Each code works once. A new set replaces the old one at once.

**Login.** A correct password opens a session whose `factors` list only holds `password`. The guard (`guard.ts`) lets such a session reach only the code step (account with a second factor) or the setup (account without). A valid code adds `totp` or `recovery` to the session. The code step expires `ADMIN_CODE_STEP_MINUTES` after the password (the session is deleted). The check lives in `sessions.ts` (`secondFactorKinds`), where passkeys can join the list.

**Limits.** Wrong codes (and wrong recovery codes) are counted per account. At `ADMIN_CODE_MAX_FAILURES` the account is locked for `ADMIN_CODE_LOCK_MINUTES`; during the lock even a good code is refused. Failures, locks, setups, replacements, recovery code use, new sets and resets are written to the activity log.

**Management.** Replacing the app needs a current code (app or recovery) and then repeats the setup; the old app works until the new one is confirmed. Another admin can reset an account's second factor (secret, recovery codes, lock; sessions end); nobody can do it to their own account, so an account never loses its last factor by its own hand.

## Alternatives considered

- **An OTP library (`otplib`, `speakeasy`)**: TOTP is about 30 lines on top of `crypto`, and the tests check it against the RFC 6238 vectors.
- **Letting an outside service draw the QR code** (as some guides suggest): sends the secret to a third party.
- **Hashing recovery codes with Argon2**: for 60-bit random codes the extra cost buys little and makes the code step slow (up to 10 checks); the keyed hash keeps the check cheap.
- **Remembering used codes in a table**: the "last used step" column gives the same guarantee with one column.

## Consequences

- Losing `ADMIN_ENCRYPTION_KEY` makes every secret unreadable: all second factors must be reset. It must be backed up (documented in `docs/dev/setup.md`). Changing it has the same effect; there is no key rotation yet.
- The server clock must be synchronised (NTP), documented in `docs/dev/setup.md`.
- A locked account can be unlocked by waiting, or by another admin resetting its second factor. Someone who knows a password can lock that account on purpose, like the login limits of ADR 0011.
- Accepting a code one step in the future moves the "last used step" forward, so the code of the current step is then refused for that account until the next step: a small cost of the replay rule.
- The end-to-end site is prepared with `pnpm admin:create --totp-secret`, because a real setup cannot be done before the first login without scanning a code.
