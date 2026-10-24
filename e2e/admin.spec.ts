import { expect, test } from '@playwright/test';
import type { Cookie, Page } from '@playwright/test';
import { adminRoutes, publicAdminRoutes } from '../src/test-support/admin-routes.ts';
import { cookieAccount, nextCode, seedPassword, seedTotpSecret } from './admin-accounts.ts';
import {
  completeSetup,
  logInWithRecovery,
  logOut,
  origin,
  otherVisitor,
  submitAppCode,
  submitPassword,
} from './admin-helpers.ts';

const strongPassword = 'Mot-de-passe-solide-17';
// What a browser sends for a form of the site itself (the request helper sends neither header).
const sameSite = { origin, 'sec-fetch-site': 'same-origin' };

async function changePassword(page: Page, current: string, next: string) {
  await page.getByLabel('Mot de passe actuel').fill(current);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(next);
  await page.getByLabel('Nouveau mot de passe, une seconde fois').fill(next);
  await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
}

test.describe('the admin area', () => {
  test.describe.configure({ mode: 'serial' });

  let me = '';
  let colleague = '';
  let colleagueTemporary = '';
  let colleagueCodes: string[] = [];
  // A code works once and the next one can be up to 30 seconds away, so the tests do not log in
  // again and again: the first login keeps its session cookies and the others reuse them.
  let myCookies: Cookie[] = [];

  async function signIn(page: Page) {
    await page.context().addCookies(myCookies);
  }

  // eslint-disable-next-line no-empty-pattern -- Playwright needs a destructured first argument
  test.beforeAll(({}, testInfo) => {
    me = `root-${testInfo.project.name}@example.test`;
    colleague = `colleague-${testInfo.project.name}@example.test`;
  });

  test('a visitor is sent to the login page', async ({ page }) => {
    await page.goto('/admin/comptes');
    await expect(page).toHaveURL(/\/admin\/connexion$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible();
  });

  test('a wrong password and an unknown email give the same message', async ({ page }) => {
    await submitPassword(page, me, 'not-the-password-123');
    await expect(page.getByTestId('login-error')).toContainText('Email ou mot de passe incorrect');
    await submitPassword(page, 'nobody@example.test', 'not-the-password-123');
    await expect(page.getByTestId('login-error')).toContainText('Email ou mot de passe incorrect');
  });

  test('first login: the code step, then the temporary password must be changed', async ({
    page,
  }) => {
    await submitPassword(page, me, seedPassword);
    // The account has a second factor: a password alone opens nothing.
    await expect(page).toHaveURL(/\/admin\/verification$/);
    await page.goto('/admin/comptes');
    await expect(page).toHaveURL(/\/admin\/verification$/);
    await page.goto('/admin/mot-de-passe');
    await expect(page).toHaveURL(/\/admin\/verification$/);

    await submitAppCode(page, await nextCode(seedTotpSecret, me));
    await expect(page).toHaveURL(/\/admin\/mot-de-passe$/);
    await expect(page.getByTestId('must-change')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Comptes' })).toHaveCount(0);

    await page.goto('/admin/comptes');
    await expect(page).toHaveURL(/\/admin\/mot-de-passe$/);

    // A wrong current password is refused.
    await changePassword(page, 'not-the-password-123', strongPassword);
    await expect(page.getByTestId('password-error')).toBeVisible();

    await changePassword(page, seedPassword, strongPassword);
    await expect(page.getByTestId('password-done')).toBeVisible();
    await page.goto('/admin/comptes');
    await expect(page.getByRole('heading', { level: 1, name: 'Comptes' })).toBeVisible();
    myCookies = await page.context().cookies();
  });

  test('an admin creates an account and sees its temporary password once', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/comptes/nouveau');
    await page.getByLabel('Nom affiché').fill('Collègue de test');
    await page.getByLabel('Email de connexion').fill(colleague);
    await page.getByRole('button', { name: 'Créer le compte' }).click();

    const shown = page.getByTestId('temporary-password-value');
    await expect(shown).toBeVisible();
    colleagueTemporary = (await shown.textContent()) ?? '';
    expect(colleagueTemporary).toHaveLength(16);

    await page.goto('/admin/comptes');
    await expect(page.locator(`tr[data-account="${colleague}"]`)).toContainText('Actif');
    await expect(page.getByText(colleagueTemporary)).toHaveCount(0);
  });

  test('the new account sets up its second factor, then must change its password', async ({
    browser,
  }) => {
    const other = await otherVisitor(browser);
    await submitPassword(other.page, colleague, colleagueTemporary);
    // No second factor yet: the setup screen is the only page.
    await expect(other.page).toHaveURL(/\/admin\/double-authentification$/);
    await expect(other.page.getByTestId('must-setup')).toBeVisible();
    await other.page.goto('/admin/comptes');
    await expect(other.page).toHaveURL(/\/admin\/double-authentification$/);

    const setup = await completeSetup(other.page, colleague);
    colleagueCodes = setup.recoveryCodes;
    expect(colleagueCodes).toHaveLength(10);

    await other.page.goto('/admin/comptes');
    await expect(other.page).toHaveURL(/\/admin\/mot-de-passe$/);
    await changePassword(other.page, colleagueTemporary, strongPassword);
    await expect(other.page.getByTestId('password-done')).toBeVisible();
    await other.page.goto('/admin/comptes');
    await expect(other.page.getByRole('heading', { level: 1, name: 'Comptes' })).toBeVisible();
    await other.close();
  });

  test('an admin disables an account, which can no longer log in, then re-enables it', async ({
    page,
    browser,
  }) => {
    const other = await otherVisitor(browser);
    await logInWithRecovery(other.page, colleague, strongPassword, colleagueCodes[0] ?? '');
    await expect(other.page).toHaveURL(/\/admin\/comptes$/);

    await signIn(page);
    await page.goto('/admin/comptes');
    const row = page.locator(`tr[data-account="${colleague}"]`);
    await row.getByRole('button', { name: 'Désactiver' }).click();
    await expect(page.getByTestId('accounts-notice')).toContainText('Compte désactivé');
    await expect(row).toContainText('Désactivé');

    // The colleague's open session ended at once.
    await other.page.goto('/admin/journal');
    await expect(other.page).toHaveURL(/\/admin\/connexion$/);
    await submitPassword(other.page, colleague, strongPassword);
    await expect(other.page.getByTestId('login-error')).toContainText(
      'Email ou mot de passe incorrect',
    );

    await row.getByRole('button', { name: 'Réactiver' }).click();
    await expect(row).toContainText('Actif');
    await logInWithRecovery(other.page, colleague, strongPassword, colleagueCodes[1] ?? '');
    await expect(other.page).toHaveURL(/\/admin\/comptes$/);
    await other.close();
  });

  test('an admin resets another password, which must then be changed', async ({
    page,
    browser,
  }) => {
    await signIn(page);
    await page.goto('/admin/comptes');
    await expect(
      page.locator(`tr[data-account="${me}"]`).getByRole('button', { name: /Réinitialiser/ }),
    ).toHaveCount(0);
    await page
      .locator(`tr[data-account="${colleague}"]`)
      .getByRole('button', { name: 'Réinitialiser le mot de passe' })
      .click();
    const shown = page.getByTestId('temporary-password-value');
    await expect(shown).toBeVisible();
    const temporary = (await shown.textContent()) ?? '';

    const other = await otherVisitor(browser);
    await submitPassword(other.page, colleague, strongPassword);
    await expect(other.page.getByTestId('login-error')).toBeVisible();
    await logInWithRecovery(other.page, colleague, temporary, colleagueCodes[2] ?? '');
    await expect(other.page).toHaveURL(/\/admin\/mot-de-passe$/);
    await expect(other.page.getByTestId('must-change')).toBeVisible();
    await other.close();
  });

  test('an admin sees the activity log and their own sessions', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/journal');
    const table = page.getByRole('table', { name: 'Journal' });
    // Newest first, 25 per page: the latest events are on the first page.
    await expect(table).toContainText('Mot de passe réinitialisé');
    await expect(table).toContainText('Connexion');
    await expect(page.getByTestId('page-position')).toContainText('Page 1 sur');

    await page.goto('/admin/sessions');
    await expect(page.locator('tr[data-current="true"]')).toContainText('Session actuelle');
  });

  test('the login is limited after too many failures, and says when to try again', async ({
    page,
  }) => {
    const email = `limit-${Date.now().toString()}@example.test`;
    for (let attempt = 0; attempt < 5; attempt++) {
      await submitPassword(page, email, 'not-the-password-123');
      await expect(page.getByTestId('login-error')).toContainText(
        'Email ou mot de passe incorrect',
      );
    }
    await submitPassword(page, email, 'not-the-password-123');
    await expect(page.getByTestId('login-error')).toContainText(/Réessayez dans \d+ minutes?/);
  });

  test('the admin pages fit the screen without sideways scrolling', async ({ page }) => {
    await signIn(page);
    for (const path of [
      '/admin/comptes',
      '/admin/journal',
      '/admin/sessions',
      '/admin/comptes/nouveau',
      '/admin/double-authentification',
      '/admin/codes-de-secours',
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('an admin logs out', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/comptes');
    await logOut(page);
    await page.goto('/admin/comptes');
    await expect(page).toHaveURL(/\/admin\/connexion$/);
  });
});

test.describe('admin security', () => {
  test('every admin page refuses a visitor without a session', async ({ request }) => {
    const routes = adminRoutes().filter((route) => !publicAdminRoutes.includes(route));
    expect(routes.length).toBeGreaterThanOrEqual(9);
    for (const route of routes) {
      const get = await request.get(route, { maxRedirects: 0 });
      expect(get.status(), `GET ${route}`).toBe(303);
      expect(get.headers()['location'], `GET ${route}`).toBe('/admin/connexion');
      const post = await request.post(route, { maxRedirects: 0, headers: sameSite });
      expect(post.status(), `POST ${route}`).toBe(401);
    }
  });

  test('a form post from another site is refused', async ({ request }) => {
    const response = await request.post('/admin/connexion', {
      maxRedirects: 0,
      headers: { origin: 'https://evil.example.test' },
      form: { email: 'x@example.test', password: 'whatever-password' },
    });
    expect(response.status()).toBe(403);
  });

  test('admin answers are kept out of search engines', async ({ request }) => {
    for (const path of ['/admin/connexion', '/admin/comptes', '/admin/unknown']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.headers()['x-robots-tag'], path).toBe('noindex');
      expect(response.headers()['cache-control'], path).toBe('no-store');
    }
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Disallow: /admin');
  });

  test('the session cookie is HttpOnly, Secure, SameSite=Strict and limited to /admin', async ({
    request,
  }) => {
    const response = await request.post('/admin/connexion', {
      maxRedirects: 0,
      headers: sameSite,
      form: { email: cookieAccount, password: seedPassword },
    });
    expect(response.status()).toBe(303);
    expect(response.headers()['location']).toBe('/admin/verification');
    const cookie = response.headers()['set-cookie'] ?? '';
    expect(cookie).toMatch(/^admin_session=[\w-]{43,};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/admin(;|$)/i);
  });
});
