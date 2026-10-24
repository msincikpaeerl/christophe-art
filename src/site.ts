// Site-wide constants and the links shared by the header and the footer.
// Interface texts live in the dictionaries (src/i18n/dictionaries); the paths in the route table.

import type { MessageKey, RouteKey } from './i18n/index.ts';

export const artistName = 'Christophe Art';

// Placeholder: replace with the artist's real profile when the owner provides it.
export const socialUrl = 'https://www.instagram.com/';

interface SiteLink {
  route: RouteKey;
  label: MessageKey;
}

export const navigation: readonly SiteLink[] = [
  { route: 'gallery', label: 'nav.gallery' },
  { route: 'about', label: 'nav.about' },
  { route: 'contact', label: 'nav.contact' },
];

export const legalLinks: readonly SiteLink[] = [
  { route: 'legalNotice', label: 'legal.legalNotice' },
  { route: 'privacy', label: 'legal.privacy' },
];
