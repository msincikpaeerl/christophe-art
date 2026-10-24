// Steps shared by the admin end-to-end tests: logging in with a second factor, setting one up.
import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { nextCode } from './admin-accounts.ts';

export const origin = 'http://127.0.0.1:4322';

/** The password step only: leaves the page on the code step, the setup or the password change. */
export async function submitPassword(page: Page, email: string, password: string) {
  await page.goto('/admin/connexion');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Types an authenticator code on the code step. */
export async function submitAppCode(page: Page, code: string) {
  await page.getByLabel('Code à 6 chiffres').fill(code);
  await page.getByRole('button', { name: 'Valider' }).click();
}

/** Types a recovery code on the code step. */
export async function submitRecoveryCode(page: Page, code: string) {
  await page.getByText('Vous n’avez plus votre application ?').click();
  await page.getByLabel('Code de secours', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Utiliser ce code de secours' }).click();
}

/** Password, then a fresh authenticator code. */
export async function logInWithApp(page: Page, email: string, password: string, secret: string) {
  await submitPassword(page, email, password);
  await expect(page).toHaveURL(/\/admin\/verification$/);
  await submitAppCode(page, await nextCode(secret, email));
}

/** Password, then a recovery code. */
export async function logInWithRecovery(
  page: Page,
  email: string,
  password: string,
  recoveryCode: string,
) {
  await submitPassword(page, email, password);
  await expect(page).toHaveURL(/\/admin\/verification$/);
  await submitRecoveryCode(page, recoveryCode);
}

/** The key shown on the setup screen, without its spaces. */
export async function shownSecret(page: Page): Promise<string> {
  const text = (await page.getByTestId('totp-secret').textContent()) ?? '';
  return text.replace(/\s/g, '');
}

/** The recovery codes shown once, after a setup or a new set. */
export async function shownRecoveryCodes(page: Page): Promise<string[]> {
  const items = await page.getByTestId('recovery-code-list').locator('li').allTextContents();
  return items.map((item) => item.trim());
}

/** On the setup screen: reads the key, types the code, returns the key and the recovery codes. */
export async function completeSetup(page: Page, email: string) {
  await expect(page).toHaveURL(/\/admin\/double-authentification$/);
  const secret = await shownSecret(page);
  await page.getByLabel('Code à 6 chiffres').fill(await nextCode(secret, email));
  await page.getByRole('button', { name: 'Activer la double authentification' }).click();
  await expect(page.getByTestId('recovery-codes')).toBeVisible();
  return { secret, recoveryCodes: await shownRecoveryCodes(page) };
}

/** A visitor with a browser of their own, to play another admin. */
export async function otherVisitor(browser: Browser) {
  const context = await browser.newContext({ baseURL: origin });
  return { page: await context.newPage(), close: () => context.close() };
}

export async function logOut(page: Page) {
  await page.locator('.account-menu summary').click();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
}
