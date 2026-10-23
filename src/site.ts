// Site-wide constants and the few interface labels shared by the header and the footer.
// The pages behind these links are built by later tickets.

export type Locale = 'fr' | 'en';

export const artistName = 'Christophe Art';

// Placeholder: replace with the artist's real profile when the owner provides it.
export const socialUrl = 'https://www.instagram.com/';

export const labels = {
  en: {
    skip: 'Skip to content',
    mainNav: 'Main navigation',
    language: 'Language',
    footerNav: 'Legal',
    social: 'Instagram',
    rights: 'All rights reserved',
    nav: { works: 'Works', about: 'About', contact: 'Contact' },
    legal: { legalNotice: 'Legal notice', privacy: 'Privacy policy' },
  },
  fr: {
    skip: 'Aller au contenu',
    mainNav: 'Navigation principale',
    language: 'Langue',
    footerNav: 'Mentions légales',
    social: 'Instagram',
    rights: 'Tous droits réservés',
    nav: { works: 'Œuvres', about: 'À propos', contact: 'Contact' },
    legal: { legalNotice: 'Mentions légales', privacy: 'Politique de confidentialité' },
  },
} as const satisfies Record<Locale, unknown>;

export const navigation = [
  { key: 'works', href: '/works' },
  { key: 'about', href: '/about' },
  { key: 'contact', href: '/contact' },
] as const;

export const legalLinks = [
  { key: 'legalNotice', href: '/legal' },
  { key: 'privacy', href: '/privacy' },
] as const;
