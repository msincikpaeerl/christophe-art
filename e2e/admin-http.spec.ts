// The admin flows seen from the server only (no browser page): forms are posted as a browser does.
import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { seedPassword } from './admin-accounts.ts';

const origin = 'http://127.0.0.1:4322';
const headers = { origin, 'sec-fetch-site': 'same-origin' };
const strongPassword = 'Un-autre-mot-de-passe-42';

function post(request: APIRequestContext, path: string, form: Record<string, string>) {
  return request.post(path, { headers, form, maxRedirects: 0 });
}

test('login, forced password change, account creation, disable, reset and log', async ({
  playwright,
}, testInfo) => {
  const stamp = `${testInfo.project.name}-${Date.now().toString()}`;
  const mate = `http-mate-${stamp}@example.test`;
  const admin = await playwright.request.newContext({ baseURL: origin });

  // The first admin comes from the server command (see playwright.config.ts).
  const seed = await post(admin, '/admin/connexion', {
    email: `root-http-${testInfo.project.name}@example.test`,
    password: seedPassword,
  });
  expect(seed.status()).toBe(303);
  expect(seed.headers()['location']).toBe('/admin/mot-de-passe');

  // Temporary password: nothing but the password change is reachable.
  const blocked = await admin.get('/admin/comptes', { maxRedirects: 0 });
  expect(blocked.status()).toBe(303);
  expect(blocked.headers()['location']).toBe('/admin/mot-de-passe');

  const tooShort = await post(admin, '/admin/mot-de-passe', {
    current: seedPassword,
    new: 'short',
    confirm: 'short',
  });
  expect(tooShort.status()).toBe(422);
  expect(await tooShort.text()).toContain('au moins 12 caractères');

  const changed = await post(admin, '/admin/mot-de-passe', {
    current: seedPassword,
    new: strongPassword,
    confirm: strongPassword,
  });
  expect(changed.status()).toBe(200);
  expect(await changed.text()).toContain('Mot de passe modifié');

  const created = await post(admin, '/admin/comptes/nouveau', { name: 'Mate', email: mate });
  expect(created.status()).toBe(200);
  const createdHtml = await created.text();
  const temporary = /data-testid="temporary-password-value"[^>]*>\s*([A-Za-z0-9]{16})\s*</.exec(
    createdHtml,
  )?.[1];
  expect(temporary).toBeDefined();
  expect(createdHtml).toContain('ne sera plus affiché');

  const duplicate = await post(admin, '/admin/comptes/nouveau', { name: 'Mate', email: mate });
  expect(duplicate.status()).toBe(422);
  expect(await duplicate.text()).toContain('utilise déjà cet email');

  const list = await (await admin.get('/admin/comptes')).text();
  expect(list).toContain(mate);
  const mateId = new RegExp(
    `data-account="${mate}"[\\s\\S]*?name="id" value="([0-9a-f-]{36})"`,
  ).exec(list)?.[1];
  expect(mateId).toBeDefined();

  // The new account: first login with the temporary password, on its own cookie jar.
  const colleague = await playwright.request.newContext({ baseURL: origin });
  const first = await post(colleague, '/admin/connexion', {
    email: mate,
    password: temporary ?? '',
  });
  expect(first.status()).toBe(303);
  expect(first.headers()['location']).toBe('/admin/mot-de-passe');
  await post(colleague, '/admin/mot-de-passe', {
    current: temporary ?? '',
    new: strongPassword,
    confirm: strongPassword,
  });
  expect((await colleague.get('/admin/comptes', { maxRedirects: 0 })).status()).toBe(200);

  // Own sessions page, and revoking the other sessions of the account.
  const sessions = await (await colleague.get('/admin/sessions')).text();
  expect(sessions).toContain('Session actuelle');

  // Disable: the open session ends at once and the login fails with the usual message.
  const disabled = await post(admin, '/admin/comptes', { intent: 'disable', id: mateId ?? '' });
  expect(await disabled.text()).toContain('Compte désactivé');
  expect((await colleague.get('/admin/comptes', { maxRedirects: 0 })).status()).toBe(303);
  const refused = await post(colleague, '/admin/connexion', {
    email: mate,
    password: strongPassword,
  });
  expect(refused.status()).toBe(401);
  expect(await refused.text()).toContain('Email ou mot de passe incorrect');

  await post(admin, '/admin/comptes', { intent: 'enable', id: mateId ?? '' });
  const again = await post(colleague, '/admin/connexion', {
    email: mate,
    password: strongPassword,
  });
  expect(again.status()).toBe(303);
  expect(again.headers()['location']).toBe('/admin/comptes');

  // Reset: a temporary password again, and the open session ends.
  const reset = await post(admin, '/admin/comptes', { intent: 'reset', id: mateId ?? '' });
  const resetHtml = await reset.text();
  const resetPassword = /data-testid="temporary-password-value"[^>]*>\s*([A-Za-z0-9]{16})\s*</.exec(
    resetHtml,
  )?.[1];
  expect(resetPassword).toBeDefined();
  expect((await colleague.get('/admin/comptes', { maxRedirects: 0 })).status()).toBe(303);
  const afterReset = await post(colleague, '/admin/connexion', {
    email: mate,
    password: resetPassword ?? '',
  });
  expect(afterReset.headers()['location']).toBe('/admin/mot-de-passe');

  // The log shows it all.
  const log = await (await admin.get('/admin/journal')).text();
  for (const text of [
    'Compte créé',
    'Compte désactivé',
    'Compte réactivé',
    'Mot de passe réinitialisé',
  ]) {
    expect(log).toContain(text);
  }

  // Logout ends the session.
  const out = await post(admin, '/admin/deconnexion', {});
  expect(out.status()).toBe(303);
  expect((await admin.get('/admin/comptes', { maxRedirects: 0 })).status()).toBe(303);
  await admin.dispose();
  await colleague.dispose();
});
