# Design system

The site presents a welder, sculptor, painter and draughtsman. It must feel like a **contemporary gallery inside a workshop**: modern, industrial, refined. The artworks are the only strong colours; the interface stays quiet.

**Every public page and the admin area follow this document.** Any new page or component uses the tokens below and the rules in this file; a deviation needs an ADR.

## Where the values live

All colours, fonts, sizes and spacings are defined **once**, as CSS custom properties, in [`src/styles/tokens.css`](../src/styles/tokens.css). Base styles are in `src/styles/global.css`. No other file writes a raw colour value: a unit test (`src/styles/design.test.ts`) fails if one appears. Use `var(--token)`.

The page `/dev/design` (served only when `DEV_PAGES=true`, never in production) shows the palette and every component.

## Mood

- **Light gallery walls** for browsing artworks; **anthracite sections** for the home hero and the footer (class `surface-dark`).
- Subtle industrial details: thin steel-coloured lines, labels styled like engraved metal plates, a line-drawn hexagon pattern.
- Generous whitespace, asymmetric grid, large images.

## Palette

| Token                   | Value     | Use                                                                 |
| ----------------------- | --------- | ------------------------------------------------------------------- |
| `--color-anthracite`    | `#1C1D1F` | Dark sections (hero, footer); main text on light walls              |
| `--color-steel`         | `#3A3D42` | Muted text on light walls; thin lines                               |
| `--color-light-steel`   | `#8A8F96` | Muted text on anthracite; lines on light walls                      |
| `--color-gallery-white` | `#F4F2EE` | Main light background; text on anthracite                           |
| `--color-paper`         | `#FAF9F6` | Raised light surfaces                                               |
| `--color-copper`        | `#B87333` | Decorative lines and small accents on dark; never text on light     |
| `--color-copper-bright` | `#CF8A4F` | Copper text, links and focus ring on dark backgrounds (AA)          |
| `--color-copper-deep`   | `#8A5222` | Copper text, links, prices and focus ring on light backgrounds (AA) |
| `--color-night-blue`    | `#1F2E45` | Rare secondary accent                                               |

Components do not pick palette colours directly; they use the **semantic tokens**, which swap on dark sections: `--surface`, `--text`, `--text-muted`, `--line`, `--accent`, `--focus-ring` (and the fixed `--surface-light`, `--surface-dark`, `--text-on-light`, `--text-on-dark`, and so on).

The copper and light-steel values were adjusted only to meet contrast: plain copper `#B87333` is 4.0:1 on anthracite, so text on dark uses `--color-copper-bright`.

### Copper rules

Copper is reserved for **interactive elements** (links, buttons, current item, focus), **prices**, and **small details** (a thin rule, the footer's top line). Never a large surface, never a background fill (a 10 % tint on button hover is the only exception).

## Contrast

Every text meets WCAG 2.1 AA (4.5:1; focus ring 3:1). The pairs are checked by `src/styles/design.test.ts` from the token values; a change to a colour that breaks AA fails the test.

## Typography

All fonts are self-hosted in `public/fonts/`, each with its SIL Open Font Licence; the site makes no request to a font service.

| Token            | Family             | Use                                    |
| ---------------- | ------------------ | -------------------------------------- |
| `--font-heading` | Cormorant Garamond | Headings: refined, high-contrast serif |
| `--font-body`    | Inter              | Body text, neutral sans-serif          |
| `--font-label`   | IBM Plex Mono      | Labels, dimensions, prices, categories |

Labels are small capitals with letter spacing (`--tracking-label`), like an engraved plate: `H 62 × W 48 × D 20 cm`. Use the `.label`, `.plate` and `.price` classes.

Sizes: `--text-xs` (0.75 rem), `--text-sm`, `--text-base` (1 rem), `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl` (fluid, for the hero). Line heights: `--leading-tight`, `--leading-snug`, `--leading-body`.

## Spacing scale

`--space-1` 0.25 rem, `--space-2` 0.5, `--space-3` 0.75, `--space-4` 1, `--space-5` 1.5, `--space-6` 2, `--space-7` 3, `--space-8` 4.5, `--space-9` 7 rem. Page gutter: `--layout-gutter`; maximum width: `--layout-max`. Interactive elements are at least `--touch-target` (2.75 rem) tall.

## Hexagon motif

A line-drawn hexagon pattern (from the hex nuts), as an SVG component `src/components/HexPattern.astro`, at low opacity (`--hex-opacity`). It is used **only** in the header, the footer and loading states, and **never behind an artwork**.

## Images

- On an artwork page the whole work is visible: never cropped (`object-fit: contain`).
- Grid thumbnails keep the artwork's ratio.
- No filter, frame or shadow on artworks. A thin line (`--line-width`, `--line`) may separate them from the background.

## Motion

Short and discreet: fades and a slight lift on hover (`--motion-fast`, `--motion-base`, `--lift-distance`). When the visitor asks for reduced motion (`prefers-reduced-motion: reduce`), all transitions and animations are disabled (global rule in `global.css`, tested).

## Accessibility and layout

- Keyboard focus is always visible: a 2 px copper outline (`--focus-ring`), deep on light and bright on dark.
- The layout works from 360 px wide with no horizontal scroll; the navigation wraps on small screens. Breakpoint: 48 em.
- A "skip to content" link is the first focusable element.

## Language switch

The FR / EN switch in the header uses the same style as the menu links: label font (`--font-label`, `--text-xs`, uppercase), `--text-muted`, current language in `--text` with a `--accent` underline, `--space-4` between the two, at least `--touch-target` tall. It adds no colour, font or spacing of its own. Texts that fall back to French are wrapped in `lang="fr"` without any visual change.

## Admin variant

The admin area (`/admin`) follows the same identity in a **sober version**, built from the same tokens and nothing else:

- Light background only (`--surface-light`, `--surface-light-raised` for the header, fields and menus). No anthracite section and **no hexagon pattern**.
- Copper only for actions: links, buttons (`.button`), the current navigation item and the focus ring. Never a fill.
- Headings in `--font-heading`, labels and table headings in `--font-label`, everything else in `--font-body`. Sizes from the `--text-*` scale, spacing from `--space-*`.
- Messages (`.alert`) use a strong line (`--line-width-strong`, `--text`) and a plate label ("Erreur", "Information") instead of a new colour, so they do not rely on colour alone. A secret shown once (a temporary password) uses `.secret` in the label font.
- Tables sit in `.table-wrap`, which scrolls inside its frame: the page never scrolls sideways. The navigation wraps on a phone and the account menu is a native `<details>` (no script). Fields and buttons are at least `--touch-target` tall.
- The admin styles are in `src/styles/admin.css`; the layout is `src/layouts/AdminLayout.astro`. The admin is in French only; texts are in `src/admin/messages.ts`.

## Components

`SiteHeader` (artist name, navigation, FR/EN switch), `SiteFooter` (anthracite; legal pages, social link), `HexPattern`, `LoadingState`, `ArtworkCard`, `LocalizedText`, and the layout `src/layouts/BaseLayout.astro`. The admin has its own layout `src/layouts/AdminLayout.astro` and the classes `.field`, `.alert`, `.secret`, `.table-wrap` / `.admin-table`, `.row-actions` and `.pager`, shown in the "Admin" part of `/dev/design`. Add each new component to `/dev/design`.
