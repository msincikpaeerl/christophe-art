import { expect, test } from '@playwright/test';

const pages = [
  { name: 'home', fr: '/fr/', en: '/en/' },
  { name: 'gallery', fr: '/fr/galerie', en: '/en/gallery' },
  { name: 'about', fr: '/fr/a-propos', en: '/en/about' },
  { name: 'contact', fr: '/fr/contact', en: '/en/contact' },
  { name: 'legal notice', fr: '/fr/mentions-legales', en: '/en/legal-notice' },
  { name: 'privacy', fr: '/fr/confidentialite', en: '/en/privacy' },
];

test.describe('the root address', () => {
  const cases = [
    ['fr-FR,fr;q=0.9,en;q=0.8', '/fr/'],
    ['en-GB,en;q=0.9', '/en/'],
    ['de-DE,en;q=0.5', '/en/'],
    ['de-DE,es;q=0.8', '/fr/'],
    ['', '/fr/'],
  ] as const;

  for (const [header, target] of cases) {
    test(`redirects "${header}" to ${target}`, async ({ request }) => {
      const response = await request.get('/', {
        headers: { 'Accept-Language': header },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(302);
      expect(response.headers()['location']).toBe(target);
      expect(response.headers()['vary']).toContain('Accept-Language');
    });
  }

  test('no other address redirects by browser language', async ({ request }) => {
    for (const path of ['/fr/', '/en/', '/fr/galerie', '/en/gallery']) {
      const response = await request.get(path, {
        headers: { 'Accept-Language': path.startsWith('/fr') ? 'en' : 'fr' },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(200);
    }
  });

  test.describe('in a French browser', () => {
    test.use({ locale: 'fr-FR' });
    test('lands on the French home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/fr\/$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    });
  });

  test.describe('in an English browser', () => {
    test.use({ locale: 'en-GB' });
    test('lands on the English home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/en\/$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  });
});

test.describe('the language switch', () => {
  for (const entry of pages) {
    test(`leads to the same page in the other language: ${entry.name}`, async ({ page }) => {
      await page.goto(`${entry.fr}?category=sculpture&sort=recent`);
      const toEnglish = page
        .getByRole('navigation', { name: 'Langue' })
        .getByRole('link', { name: 'en' });
      await expect(toEnglish).toHaveAttribute('href', `${entry.en}?category=sculpture&sort=recent`);
      await toEnglish.click();
      await expect(page).toHaveURL(`${entry.en}?category=sculpture&sort=recent`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');

      await page
        .getByRole('navigation', { name: 'Language' })
        .getByRole('link', { name: 'fr' })
        .click();
      await expect(page).toHaveURL(`${entry.fr}?category=sculpture&sort=recent`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    });
  }

  test('is marked on the current language and sized for touch', async ({ page }) => {
    await page.goto('/fr/');
    const nav = page.getByRole('navigation', { name: 'Langue' });
    await expect(nav.getByRole('link', { name: 'fr' })).toHaveAttribute('aria-current', 'true');
    const box = await nav.getByRole('link', { name: 'en' }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe('page metadata', () => {
  for (const entry of pages) {
    test(`has a canonical URL and hreflang links: ${entry.name}`, async ({ page, baseURL }) => {
      const origin = baseURL ?? '';
      await page.goto(entry.en);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        origin + entry.en,
      );
      await expect(page.locator('link[hreflang="fr"]')).toHaveAttribute('href', origin + entry.fr);
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', origin + entry.en);
      await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
        'href',
        origin + entry.fr,
      );
    });
  }
});

test.describe('404 pages', () => {
  const cases = [
    { path: '/de/', lang: 'fr', home: '/fr/', title: 'Page introuvable' },
    { path: '/nope', lang: 'fr', home: '/fr/', title: 'Page introuvable' },
    { path: '/fr/inconnue', lang: 'fr', home: '/fr/', title: 'Page introuvable' },
    { path: '/en/nope', lang: 'en', home: '/en/', title: 'Page not found' },
    { path: '/en/galerie', lang: 'en', home: '/en/', title: 'Page not found' },
  ] as const;

  for (const entry of cases) {
    test(`${entry.path} answers a 404 in ${entry.lang}`, async ({ page }) => {
      const response = await page.goto(entry.path);
      expect(response?.status()).toBe(404);
      await expect(page.locator('html')).toHaveAttribute('lang', entry.lang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title);
      const home = page.getByTestId('not-found').getByRole('link');
      await expect(home).toHaveAttribute('href', entry.home);
      await home.click();
      await expect(page).toHaveURL(entry.home);
    });
  }
});

test.describe('server answers', () => {
  const notFound = [
    ['/de/', 'fr'],
    ['/nope', 'fr'],
    ['/fr/inconnue', 'fr'],
    ['/en/nope', 'en'],
    ['/en/galerie', 'en'],
    ['/en/gallery/unknown', 'en'],
  ] as const;

  for (const [path, lang] of notFound) {
    test(`${path} is a 404 in ${lang}, with a link to the home page`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
      const html = await response.text();
      expect(html).toContain(`<html lang="${lang}"`);
      expect(html).toContain(`href="/${lang}/"`);
    });
  }

  for (const entry of pages) {
    test(`${entry.en} declares its language, canonical URL and alternates`, async ({
      request,
      baseURL,
    }) => {
      const origin = baseURL ?? '';
      const response = await request.get(entry.fr);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain('<html lang="fr"');
      expect(html).toContain(`<link rel="canonical" href="${origin + entry.fr}"`);
      expect(html).toContain(`hreflang="fr" href="${origin + entry.fr}"`);
      expect(html).toContain(`hreflang="en" href="${origin + entry.en}"`);
      expect(html).toContain(`hreflang="x-default" href="${origin + entry.fr}"`);
    });
  }
});

test('an English field without a translation shows the French text, marked as French', async ({
  page,
}) => {
  await page.goto('/dev/design');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('span[lang="fr"]')).toHaveText('Arbre hexagonal');
});
