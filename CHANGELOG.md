# Changelog

User-facing changes, newest first. One entry per merged ticket with a user-visible effect, written for users.

## Unreleased

- Every admin account now needs a second factor. After the password, an account without one can only reach a setup screen with a QR code (drawn by the site itself) and the key as text, and the setup is saved only once a valid code from an authenticator app (Google Authenticator, Aegis, 1Password…) is typed. Later logins ask for a 6-digit code after the password, within 5 minutes; a code works once, and too many wrong codes lock the account for a while. At setup, 10 recovery codes are shown once (with a text-file download); each works once in place of a code, the admin sees how many remain, is warned at 2 or fewer, and can generate a new set that replaces the old one at once. The authenticator app can be replaced with a current code, and another admin can reset someone's second factor (their sessions end and they set it up again). All of this is in the activity log. The server now requires `ADMIN_ENCRYPTION_KEY` and a synchronised clock (see the setup guide). New user guide pages: "Activer la double authentification" and "Codes de secours".

- The admin area (`/admin`, in French) exists. Several people can have an account with the same rights and sign in with an email and a password (at least 12 characters, no common password). A new account gets a temporary password, shown once, that must be changed at the first login. Any admin can create accounts, disable and re-enable them (the last active account cannot be disabled), reset another password, change their own password, see and close their own sessions, and read a paged activity log. Failed logins are limited and say when to try again. The first account is created on the server with `pnpm admin:create`, and a password can be reset with `pnpm admin:reset-password`. New user guide pages: "Se connecter" and "Gérer les comptes".

- The public site exists in French and English. Every address starts with `/fr/` or `/en/`, the FR / EN switch leads to the same page in the other language (filters included), the bare address sends you to the language of your browser (French by default), and unknown pages show a "Page not found" page in your language.

- The site has its visual identity: gallery-white pages with anthracite sections, copper accents, self-hosted fonts, a header (name, menu, FR/EN switch) and a dark footer, readable with good contrast, keyboard-friendly, and without animations for visitors who ask for reduced motion.

- The site can be started with Docker and shows a placeholder home page. The address `/health` reports whether the site and its database work.
