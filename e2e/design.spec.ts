import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const showcase = '/dev/design';

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

// Compares with the committed baseline (e2e/design.spec.ts-snapshots). Until a baseline is
// committed for a project, the screenshot is still taken and attached to the report, so the
// page is proven to render; see docs/dev/testing.md to create the baselines.
test('the design showcase matches its screenshot', async ({ page }, testInfo) => {
  await open(page, showcase);
  await expect(page.getByTestId('design-page')).toBeVisible();
  const options = { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.03 } as const;
  if (existsSync(testInfo.snapshotPath('design-showcase.png'))) {
    await expect(page).toHaveScreenshot('design-showcase.png', options);
  } else {
    await testInfo.attach('design-showcase', {
      body: await page.screenshot(options),
      contentType: 'image/png',
    });
  }
});

test('the showcase is not indexed', async ({ page }) => {
  await open(page, showcase);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

for (const path of ['/', showcase]) {
  test(`no horizontal scroll at 360 px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page, path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('the header and footer carry the identity', async ({ page }) => {
  await open(page, '/');
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Christophe Art' })).toBeVisible();
  await expect(header.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'fr' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'en' })).toBeVisible();

  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Legal notice' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Instagram' })).toBeVisible();
  const background = await footer.evaluate((node) => getComputedStyle(node).backgroundColor);
  const anthracite = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.background = 'var(--color-anthracite)';
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  expect(background).toBe(anthracite);
});

test('the hexagon pattern appears in the header, the footer and the loading state only', async ({
  page,
}) => {
  await open(page, showcase);
  const patterns = page.locator('svg.hex-pattern');
  await expect(patterns).toHaveCount(3);
  const homes = await patterns.evaluateAll((nodes) =>
    nodes.map((node) => node.closest('header, footer, [role="status"]')?.tagName ?? 'none'),
  );
  expect(homes.sort()).toEqual(['DIV', 'FOOTER', 'HEADER']);
  const opacity = await patterns.first().evaluate((node) => Number(getComputedStyle(node).opacity));
  expect(opacity).toBeLessThanOrEqual(0.2);
});

test('keyboard focus is visible, in a copper outline', async ({ page }) => {
  await open(page, '/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test.describe('motion', () => {
  async function transitionOfButton(page: Page) {
    return page
      .locator('a.button')
      .first()
      .evaluate((node) => getComputedStyle(node).transitionDuration);
  }
  async function animationOfLoading(page: Page) {
    return page.getByRole('status').evaluate((node) => getComputedStyle(node).animationName);
  }

  test('transitions and animations run by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, showcase);
    expect(await transitionOfButton(page)).not.toMatch(/^0s(, 0s)*$/);
    expect(await animationOfLoading(page)).not.toBe('none');
  });

  test('transitions and animations are disabled when the visitor asks for reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, showcase);
    expect(await transitionOfButton(page)).toMatch(/^0s(, 0s)*$/);
    expect(await animationOfLoading(page)).toBe('none');
  });
});

test('fonts are self-hosted: no request leaves the site', async ({ page, baseURL }) => {
  const external: string[] = [];
  const fontFiles: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL ?? '')) external.push(request.url());
    if (request.url().includes('/fonts/')) fontFiles.push(request.url());
  });
  await open(page, showcase);
  expect(external).toEqual([]);
  expect(fontFiles.length).toBeGreaterThan(0);
});
