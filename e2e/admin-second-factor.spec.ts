// The second factor, as an admin sees it: setup, codes, recovery codes, lock, replacement, reset.
// Codes are computed from the secret shown on the setup screen, like an authenticator app does.
import { expect, test } from '@playwright/test';
import type { Browser, Cookie, Page } from '@playwright/test';
import { nextCode, seedPassword, seedTotpSecret } from './admin-accounts.ts';
import {
  logInWithApp,
  logInWithRecovery,
  logOut,
  otherVisitor,
  shownRecoveryCodes,
  shownSecret,
  submitAppCode,
  submitPassword,
  submitRecoveryCode,
} from './admin-helpers.ts';

const strongPassword = 'Phrase-de-passe-longue-31';
const activate = 'Activer la double authentification';

async function changeTemporaryPassword(page: Page, temporary: string) {
  await page.goto('/admin/mot-de-passe');
  await page.getByLabel('Mot de passe actuel').fill(temporary);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(strongPassword);
  await page.getByLabel('Nouveau mot de passe, une seconde fois').fill(strongPassword);
  await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
  await expect(page.getByTestId('password-done')).toBeVisible();
}

test.describe('the second factor', () => {
  test.describe.configure({ mode: 'serial' });

  let admin = '';
  let ada = '';
  let bob = '';
  let adminCookies: Cookie[] = [];
  let adaSecret = '';
  let adaCodes: string[] = [];

  /** Creates an account from the admin's page and returns its temporary password. */
  async function createAccount(page: Page, email: string, name: string): Promise<string> {
    await page.context().addCookies(adminCookies);
    await page.goto('/admin/comptes/nouveau');
    await page.getByLabel('Nom affiché').fill(name);
    await page.getByLabel('Email de connexion').fill(email);
    await page.getByRole('button', { name: 'Créer le compte' }).click();
    return (await page.getByTestId('temporary-password-value').textContent()) ?? '';
  }

  /** Sets a new account up in a browser of its own: setup, then the forced password change. */
  async function onboard(browser: Browser, email: string, temporary: string) {
    const visitor = await otherVisitor(browser);
    await submitPassword(visitor.page, email, temporary);
    await expect(visitor.page).toHaveURL(/\/admin\/double-authentification$/);
    const secret = await shownSecret(visitor.page);
    await visitor.page.getByLabel('Code à 6 chiffres').fill(await nextCode(secret, email));
    await visitor.page.getByRole('button', { name: activate }).click();
    await expect(visitor.page.getByTestId('recovery-codes')).toBeVisible();
    const recoveryCodes = await shownRecoveryCodes(visitor.page);
    await changeTemporaryPassword(visitor.page, temporary);
    return { visitor, secret, recoveryCodes };
  }

  // eslint-disable-next-line no-empty-pattern -- Playwright needs a destructured first argument
  test.beforeAll(({}, testInfo) => {
    const project = testInfo.project.name;
    const stamp = Date.now().toString();
    admin = `root-factor-${project}@example.test`;
    ada = `ada-${project}-${stamp}@example.test`;
    bob = `bob-${project}-${stamp}@example.test`;
  });

  test('the admin signs in with a code and changes the temporary password', async ({ page }) => {
    await submitPassword(page, admin, seedPassword);
    await submitAppCode(page, await nextCode(seedTotpSecret, admin));
    await expect(page).toHaveURL(/\/admin\/mot-de-passe$/);
    await changeTemporaryPassword(page, seedPassword);
    adminCookies = await page.context().cookies();
  });

  test('setup shows a QR code and the key, saves only after a valid code, and shows 10 recovery codes once', async ({
    page,
    browser,
  }) => {
    const temporary = await createAccount(page, ada, 'Ada de test');

    const visitor = await otherVisitor(browser);
    // Nothing leaves the site: the QR code is drawn by the server.
    const outside: string[] = [];
    visitor.page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4322/')) outside.push(request.url());
    });
    await submitPassword(visitor.page, ada, temporary);
    await expect(visitor.page).toHaveURL(/\/admin\/double-authentification$/);
    await expect(visitor.page.getByTestId('qr').locator('svg.qr')).toBeVisible();
    adaSecret = await shownSecret(visitor.page);
    expect(adaSecret).toMatch(/^[A-Z2-7]{32}$/);

    // A wrong code saves nothing: the setup stays the only page.
    await visitor.page.getByLabel('Code à 6 chiffres').fill('000000');
    await visitor.page.getByRole('button', { name: activate }).click();
    await expect(visitor.page.getByTestId('factor-error')).toBeVisible();
    await visitor.page.goto('/admin/comptes');
    await expect(visitor.page).toHaveURL(/\/admin\/double-authentification$/);
    // Reloading keeps the same key, so a code already scanned is not lost.
    expect(await shownSecret(visitor.page)).toBe(adaSecret);

    await visitor.page.getByLabel('Code à 6 chiffres').fill(await nextCode(adaSecret, ada));
    await visitor.page.getByRole('button', { name: activate }).click();
    await expect(visitor.page.getByTestId('recovery-codes')).toBeVisible();
    adaCodes = await shownRecoveryCodes(visitor.page);
    expect(adaCodes).toHaveLength(10);
    expect(new Set(adaCodes).size).toBe(10);
    const download = visitor.page.getByTestId('recovery-download');
    await expect(download).toHaveAttribute('download', 'codes-de-secours.txt');
    const href = (await download.getAttribute('href')) ?? '';
    expect(decodeURIComponent(href)).toContain(adaCodes[0] ?? 'missing');
    expect(outside).toEqual([]);

    await changeTemporaryPassword(visitor.page, temporary);
    // Shown once: the recovery page only counts them.
    await visitor.page.goto('/admin/codes-de-secours');
    await expect(visitor.page.getByTestId('recovery-remaining')).toHaveText('10');
    await expect(visitor.page.getByTestId('recovery-code-list')).toHaveCount(0);
    await visitor.close();
  });

  test('login with an app code: a wrong code is refused, and a code already used is too', async ({
    browser,
  }) => {
    const visitor = await otherVisitor(browser);
    await submitPassword(visitor.page, ada, strongPassword);
    await expect(visitor.page).toHaveURL(/\/admin\/verification$/);
    // The password alone opens nothing.
    await visitor.page.goto('/admin/comptes');
    await expect(visitor.page).toHaveURL(/\/admin\/verification$/);

    await submitAppCode(visitor.page, '000000');
    await expect(visitor.page.getByTestId('code-error')).toContainText('Code incorrect');
    const code = await nextCode(adaSecret, ada);
    await submitAppCode(visitor.page, code);
    await expect(visitor.page).toHaveURL(/\/admin\/comptes$/);

    await logOut(visitor.page);
    await submitPassword(visitor.page, ada, strongPassword);
    await submitAppCode(visitor.page, code);
    await expect(visitor.page.getByTestId('code-error')).toContainText('déjà utilisé');
    await expect(visitor.page).toHaveURL(/\/admin\/verification$/);
    await visitor.close();
  });

  test('login with a recovery code, which works once', async ({ browser }) => {
    const visitor = await otherVisitor(browser);
    await logInWithRecovery(visitor.page, ada, strongPassword, adaCodes[0] ?? '');
    await expect(visitor.page).toHaveURL(/\/admin\/comptes$/);
    await visitor.page.goto('/admin/codes-de-secours');
    await expect(visitor.page.getByTestId('recovery-remaining')).toHaveText('9');

    await logOut(visitor.page);
    await submitPassword(visitor.page, ada, strongPassword);
    await submitRecoveryCode(visitor.page, adaCodes[0] ?? '');
    await expect(visitor.page.getByTestId('code-error')).toBeVisible();
    await expect(visitor.page).toHaveURL(/\/admin\/verification$/);
    await submitRecoveryCode(visitor.page, adaCodes[1] ?? '');
    await expect(visitor.page).toHaveURL(/\/admin\/comptes$/);
    await visitor.close();
  });

  test('the remaining recovery codes are counted, a warning comes at two, and a new set replaces the old', async ({
    browser,
  }) => {
    const visitor = await otherVisitor(browser);
    // Codes 0 and 1 are used. Use five more: 3 remain, no warning yet.
    for (const index of [2, 3, 4, 5, 6]) {
      await logInWithRecovery(visitor.page, ada, strongPassword, adaCodes[index] ?? '');
      await expect(visitor.page).toHaveURL(/\/admin\/comptes$/);
      if (index === 6) {
        await visitor.page.goto('/admin/codes-de-secours');
        await expect(visitor.page.getByTestId('recovery-remaining')).toHaveText('3');
        await expect(visitor.page.getByTestId('recovery-warning')).toHaveCount(0);
      }
      await logOut(visitor.page);
    }
    await logInWithRecovery(visitor.page, ada, strongPassword, adaCodes[7] ?? '');
    await visitor.page.goto('/admin/codes-de-secours');
    await expect(visitor.page.getByTestId('recovery-remaining')).toHaveText('2');
    await expect(visitor.page.getByTestId('recovery-warning')).toBeVisible();

    await visitor.page.getByRole('button', { name: 'Générer un nouveau jeu de codes' }).click();
    const fresh = await shownRecoveryCodes(visitor.page);
    expect(fresh).toHaveLength(10);
    await expect(visitor.page.getByTestId('recovery-remaining')).toHaveText('10');
    await expect(visitor.page.getByTestId('recovery-warning')).toHaveCount(0);

    // The old set stops working at once, the new one works.
    await logOut(visitor.page);
    await logInWithRecovery(visitor.page, ada, strongPassword, adaCodes[8] ?? '');
    await expect(visitor.page.getByTestId('code-error')).toBeVisible();
    await submitRecoveryCode(visitor.page, fresh[0] ?? '');
    await expect(visitor.page).toHaveURL(/\/admin\/comptes$/);
    adaCodes = fresh;
    await visitor.close();
  });

  test('replacing the authenticator app needs a current code and goes through setup again', async ({
    browser,
  }) => {
    const visitor = await otherVisitor(browser);
    await logInWithRecovery(visitor.page, ada, strongPassword, adaCodes[1] ?? '');
    await visitor.page.goto('/admin/double-authentification');
    await expect(visitor.page.getByTestId('factor-status')).toBeVisible();
    await expect(visitor.page.getByTestId('qr')).toHaveCount(0);

    const current = visitor.page.getByLabel('Code actuel (application ou code de secours)');
    await current.fill('000000');
    await visitor.page.getByRole('button', { name: 'Remplacer l’application' }).click();
    await expect(visitor.page.getByTestId('factor-error')).toBeVisible();
    await expect(visitor.page.getByTestId('qr')).toHaveCount(0);

    await current.fill(adaCodes[2] ?? '');
    await visitor.page.getByRole('button', { name: 'Remplacer l’application' }).click();
    await expect(visitor.page.getByTestId('qr').locator('svg.qr')).toBeVisible();
    const replacement = await shownSecret(visitor.page);
    expect(replacement).not.toBe(adaSecret);
    await visitor.page.getByLabel('Code à 6 chiffres').fill(await nextCode(replacement, ada));
    await visitor.page.getByRole('button', { name: activate }).click();
    await expect(visitor.page.getByTestId('factor-notice')).toContainText('remplacée');

    // The new app opens a session; the old one no longer does.
    await logOut(visitor.page);
    await logInWithApp(visitor.page, ada, strongPassword, replacement);
    await expect(visitor.page).toHaveURL(/\/admin\/comptes$/);
    await logOut(visitor.page);
    await submitPassword(visitor.page, ada, strongPassword);
    await submitAppCode(visitor.page, await nextCode(adaSecret, `${ada} (old app)`));
    await expect(visitor.page.getByTestId('code-error')).toBeVisible();
    await visitor.close();
  });

  test('too many wrong codes lock the account, whatever code comes next', async ({
    page,
    browser,
  }) => {
    const temporary = await createAccount(page, bob, 'Bob de test');
    const { visitor, secret } = await onboard(browser, bob, temporary);
    await logOut(visitor.page);

    await submitPassword(visitor.page, bob, strongPassword);
    // Three wrong codes lock the account (the limit is 3 in these tests).
    for (let attempt = 0; attempt < 2; attempt++) {
      await submitAppCode(visitor.page, '000000');
      await expect(visitor.page.getByTestId('code-error')).toContainText('Code incorrect');
    }
    await submitAppCode(visitor.page, '000000');
    await expect(visitor.page.getByTestId('code-error')).toContainText(/verrouillé.*\d+ minutes?/);

    // Locked: even the right code is refused.
    await submitAppCode(visitor.page, await nextCode(secret, bob));
    await expect(visitor.page.getByTestId('code-error')).toContainText('verrouillé');
    await expect(visitor.page).toHaveURL(/\/admin\/verification$/);

    await page.goto('/admin/journal');
    await expect(page.getByRole('table', { name: 'Journal' })).toContainText(
      'Compte verrouillé après trop de codes incorrects',
    );
    await visitor.close();
  });

  test('another admin resets the second factor: sessions end and the setup comes back', async ({
    page,
    browser,
  }) => {
    await page.context().addCookies(adminCookies);
    await page.goto('/admin/comptes');
    // Nobody can remove their own second factor: the button is not on their own row.
    await expect(
      page.locator(`tr[data-account="${admin}"]`).getByRole('button', {
        name: 'Réinitialiser la double authentification',
      }),
    ).toHaveCount(0);

    // Bob is at the code step (locked), with a session of his own.
    const visitor = await otherVisitor(browser);
    await submitPassword(visitor.page, bob, strongPassword);
    await expect(visitor.page).toHaveURL(/\/admin\/verification$/);

    const bobsRow = page.locator(`tr[data-account="${bob}"]`);
    await bobsRow.getByRole('button', { name: 'Réinitialiser la double authentification' }).click();
    await expect(page.getByTestId('accounts-notice')).toContainText('réinitialisée');
    await expect(bobsRow.getByTestId('second-factor')).toContainText('Non configurée');
    await page.goto('/admin/journal');
    await expect(page.getByRole('table', { name: 'Journal' })).toContainText(
      'Double authentification réinitialisée',
    );

    // His session is gone, and his next login leads to the setup, with no lock left.
    await visitor.page.goto('/admin/verification');
    await expect(visitor.page).toHaveURL(/\/admin\/connexion$/);
    await submitPassword(visitor.page, bob, strongPassword);
    await expect(visitor.page).toHaveURL(/\/admin\/double-authentification$/);
    await expect(visitor.page.getByTestId('must-setup')).toBeVisible();
    const secret = await shownSecret(visitor.page);
    await visitor.page.getByLabel('Code à 6 chiffres').fill(await nextCode(secret, bob));
    await visitor.page.getByRole('button', { name: activate }).click();
    await expect(visitor.page.getByTestId('recovery-codes')).toBeVisible();
    await visitor.close();
  });
});
