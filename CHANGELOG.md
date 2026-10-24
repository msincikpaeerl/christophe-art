# Changelog

User-facing changes, newest first. One entry per merged ticket with a user-visible effect, written for users.

## Unreleased

- The admin area (`/admin`, in French) exists. Several people can have an account with the same rights and sign in with an email and a password (at least 12 characters, no common password). A new account gets a temporary password, shown once, that must be changed at the first login. Any admin can create accounts, disable and re-enable them (the last active account cannot be disabled), reset another password, change their own password, see and close their own sessions, and read a paged activity log. Failed logins are limited and say when to try again. The first account is created on the server with `pnpm admin:create`, and a password can be reset with `pnpm admin:reset-password`. New user guide pages: "Se connecter" and "Gérer les comptes".

- The public site exists in French and English. Every address starts with `/fr/` or `/en/`, the FR / EN switch leads to the same page in the other language (filters included), the bare address sends you to the language of your browser (French by default), and unknown pages show a "Page not found" page in your language.

- The site has its visual identity: gallery-white pages with anthracite sections, copper accents, self-hosted fonts, a header (name, menu, FR/EN switch) and a dark footer, readable with good contrast, keyboard-friendly, and without animations for visitors who ask for reduced motion.

- The site can be started with Docker and shows a placeholder home page. The address `/health` reports whether the site and its database work.
