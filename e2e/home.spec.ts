import { expect, test } from '@playwright/test';

test('the placeholder home page opens', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Christophe Art');
  await expect(page.getByRole('heading', { level: 1, name: 'Christophe Art' })).toBeVisible();
});

test('the health endpoint answers', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.status()).toBe(200);
});
