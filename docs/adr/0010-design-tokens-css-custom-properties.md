# 0010 — Design tokens: CSS custom properties, self-hosted fonts

- Status: accepted
- Date: 2026-10-24

## Context

The site and the admin must share one visual identity, with every colour, font, size and spacing defined once, fonts served without any third-party request, and text that meets WCAG AA.

## Decision

Define the tokens as CSS custom properties in `src/styles/tokens.css`, with plain CSS and Astro scoped styles for components (no CSS framework). Semantic tokens (`--surface`, `--text`, `--accent`, …) are swapped by the `surface-dark` class for dark sections. Fonts (Cormorant Garamond, Inter, IBM Plex Mono, all SIL OFL) are copied into `public/fonts/` with their licences and declared in `tokens.css`. A unit test enforces the rules: no raw colour outside the tokens file, every token used is defined, AA contrast of every text/background pair, fonts present, no font-service URL. The design showcase page is behind the `DEV_PAGES` setting.

## Alternatives considered

- **Tailwind CSS**: a new dependency and a second place for tokens; not needed for a site of this size.
- **Font packages as dependencies** (`@fontsource`): files are fetched at install time; copying the files keeps the licences and the exact files in the repository.
- **A TypeScript token file generating the CSS**: more machinery, with no benefit for a CSS-only consumer.

## Consequences

- Changing a colour means editing `tokens.css`; the contrast test tells whether it is still accessible.
- New components must be added to `/dev/design`.
- Only the Latin and Latin-extended font subsets are shipped; another script needs more files.
