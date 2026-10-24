import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminRoutes, publicAdminRoutes } from '../../test-support/admin-routes.ts';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { adminAccounts } from '../schema.ts';
import { createAccount } from './accounts.ts';
import { clientIp, guardAdminRequest, isAdminPath, landingPath } from './guard.ts';
import { createSession } from './sessions.ts';
import { testSettings } from './test-settings.ts';

const origin = 'https://site.example.test';
const publicRoutes = publicAdminRoutes;

let testDb: TestDatabase;
let token = '';
let mustChangeToken = '';
/** An account with a second factor whose session has only typed the password. */
let passwordOnlyToken = '';
/** An account without any second factor. */
let noFactorToken = '';

beforeAll(async () => {
  testDb = await createTestDatabase();
  await testDb.migrate();
  const actor = { name: 'setup', ip: '::1' };
  const ready = await createAccount(testDb.db, {
    displayName: 'Ready',
    email: 'ready@example.test',
    actor,
    temporaryPassword: 'a-very-unusual-passphrase',
  });
  const fresh = await createAccount(testDb.db, {
    displayName: 'Fresh',
    email: 'fresh@example.test',
    actor,
    temporaryPassword: 'a-very-unusual-passphrase',
  });
  const plain = await createAccount(testDb.db, {
    displayName: 'Plain',
    email: 'plain@example.test',
    actor,
    temporaryPassword: 'a-very-unusual-passphrase',
  });
  if (!ready.ok || !fresh.ok || !plain.ok) throw new Error('setup failed');
  // "Ready" and "Fresh" have a second factor (any stored secret: the guard only checks it exists).
  await testDb.db
    .update(adminAccounts)
    .set({ mustChangePassword: false, totpSecret: 'stored' })
    .where(eq(adminAccounts.id, ready.account.id));
  await testDb.db
    .update(adminAccounts)
    .set({ totpSecret: 'stored' })
    .where(eq(adminAccounts.id, fresh.account.id));
  const options = { userAgent: 'test', ip: '::1' };
  const verified = ['password', 'totp'];
  token = (
    await createSession(testDb.db, { accountId: ready.account.id, factors: verified, ...options })
  ).token;
  mustChangeToken = (
    await createSession(testDb.db, { accountId: fresh.account.id, factors: verified, ...options })
  ).token;
  passwordOnlyToken = (
    await createSession(testDb.db, {
      accountId: ready.account.id,
      factors: ['password'],
      ...options,
    })
  ).token;
  noFactorToken = (
    await createSession(testDb.db, {
      accountId: plain.account.id,
      factors: ['password'],
      ...options,
    })
  ).token;
});

afterAll(async () => {
  await testDb.dispose();
});

function guard(
  method: string,
  path: string,
  options: { cookieToken?: string; origin?: string | null } = {},
) {
  const headers = new Headers();
  const sent = options.origin === undefined ? origin : options.origin;
  if (sent !== null) headers.set('origin', sent);
  return guardAdminRequest({
    request: new Request(origin + path, { method, headers }),
    db: testDb.db,
    settings: testSettings,
    cookieToken: options.cookieToken,
  });
}

describe('admin routes', () => {
  const routes = adminRoutes();

  it('are listed from the page files', () => {
    expect(routes).toContain('/admin/comptes');
    expect(routes).toContain('/admin/connexion');
    expect(routes.length).toBeGreaterThanOrEqual(7);
    expect(routes.every((route) => route === '/admin' || route.startsWith('/admin/'))).toBe(true);
  });

  const protectedRoutes = routes.filter((route) => !publicRoutes.includes(route));

  it.each(protectedRoutes)('%s refuses a visitor without a session (GET)', async (route) => {
    const result = await guard('GET', route);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(303);
      expect(result.response.headers.get('location')).toBe('/admin/connexion');
    }
  });

  it.each(protectedRoutes)('%s refuses a visitor without a session (POST)', async (route) => {
    const result = await guard('POST', route);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(401);
  });

  it.each(protectedRoutes)('%s refuses an unknown session cookie', async (route) => {
    expect((await guard('GET', route, { cookieToken: 'not-a-session' })).allowed).toBe(false);
    expect((await guard('POST', route, { cookieToken: 'not-a-session' })).allowed).toBe(false);
  });

  it.each(protectedRoutes)('%s accepts a valid session', async (route) => {
    expect((await guard('GET', route, { cookieToken: token })).allowed).toBe(true);
    expect((await guard('POST', route, { cookieToken: token })).allowed).toBe(true);
  });

  it('lets a visitor open the login page only', async () => {
    for (const route of publicRoutes) {
      expect((await guard('GET', route)).allowed).toBe(true);
      expect((await guard('POST', route)).allowed).toBe(true);
    }
  });
});

describe('Origin check', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'refuses a %s with another Origin',
    async (method) => {
      for (const bad of ['https://evil.example.test', 'null', 'http://site.example.test', '']) {
        const result = await guard(method, '/admin/comptes', { cookieToken: token, origin: bad });
        expect(result.allowed, `${method} ${bad}`).toBe(false);
        if (!result.allowed) expect(result.response.status).toBe(403);
      }
    },
  );

  it('refuses a request that changes something without any Origin', async () => {
    const result = await guard('POST', '/admin/comptes', { cookieToken: token, origin: null });
    expect(result.allowed).toBe(false);
  });

  it('checks the Origin of the login form too', async () => {
    const result = await guard('POST', '/admin/connexion', { origin: 'https://evil.example.test' });
    expect(result.allowed).toBe(false);
  });

  it('does not ask GET requests for an Origin', async () => {
    expect(
      (await guard('GET', '/admin/comptes', { cookieToken: token, origin: null })).allowed,
    ).toBe(true);
  });

  it('compares with the address of the request when SITE_URL is not set', async () => {
    const result = await guardAdminRequest({
      request: new Request('http://localhost:4321/admin/comptes', {
        method: 'POST',
        headers: { origin: 'http://localhost:4321' },
      }),
      db: testDb.db,
      settings: { ...testSettings, siteUrl: undefined },
      cookieToken: token,
    });
    expect(result.allowed).toBe(true);
  });
});

describe('path tricks', () => {
  it.each([
    '/admin/%63omptes',
    '/%61dmin/comptes',
    '/admin//comptes',
    '/admin/comptes/',
    '/ADMIN/comptes',
    '/admin/%2e%2e/admin/comptes',
    '/admin/connexion/..%2fcomptes',
    '/admin/connexion%2fx',
    '/admin/%',
  ])('%s is still treated as admin and refused without a session', async (path) => {
    expect(isAdminPath(path)).toBe(true);
    expect((await guard('GET', path)).allowed).toBe(false);
  });

  it('does not treat other pages as admin', () => {
    expect(isAdminPath('/fr/')).toBe(false);
    expect(isAdminPath('/administrator')).toBe(false);
    expect(isAdminPath('/health')).toBe(false);
  });
});

describe('temporary password', () => {
  it('leaves only the password change and the logout open', async () => {
    const options = { cookieToken: mustChangeToken };
    expect((await guard('GET', '/admin/mot-de-passe', options)).allowed).toBe(true);
    expect((await guard('POST', '/admin/mot-de-passe', options)).allowed).toBe(true);
    expect((await guard('POST', '/admin/deconnexion', options)).allowed).toBe(true);
    for (const path of ['/admin/comptes', '/admin/journal', '/admin/sessions']) {
      const result = await guard('GET', path, options);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.headers.get('location')).toBe('/admin/mot-de-passe');
      }
      expect((await guard('POST', path, options)).allowed).toBe(false);
    }
  });
});

describe('second factor', () => {
  const routes = adminRoutes().filter((route) => !publicRoutes.includes(route));
  const setup = '/admin/double-authentification';
  const code = '/admin/verification';
  const logout = '/admin/deconnexion';

  it('has the setup and code step pages among the routes', () => {
    expect(routes).toContain(setup);
    expect(routes).toContain(code);
    expect(routes).toContain('/admin/codes-de-secours');
  });

  const withoutFactor = routes.filter((route) => route !== setup && route !== logout);
  it.each(withoutFactor)('%s is refused to an account without a second factor', async (route) => {
    for (const method of ['GET', 'POST']) {
      const result = await guard(method, route, { cookieToken: noFactorToken });
      expect(result.allowed, `${method} ${route}`).toBe(false);
      if (!result.allowed && method === 'GET') {
        expect(result.response.status).toBe(303);
        expect(result.response.headers.get('location')).toBe(setup);
      }
      if (!result.allowed && method === 'POST') expect(result.response.status).toBe(403);
    }
  });

  it('leaves an account without a second factor the setup and the logout only', async () => {
    for (const route of [setup, logout]) {
      expect((await guard('GET', route, { cookieToken: noFactorToken })).allowed).toBe(true);
      expect((await guard('POST', route, { cookieToken: noFactorToken })).allowed).toBe(true);
    }
  });

  const beforeCode = routes.filter((route) => route !== code && route !== logout);
  it.each(beforeCode)('%s is refused before the code is typed', async (route) => {
    for (const method of ['GET', 'POST']) {
      const result = await guard(method, route, { cookieToken: passwordOnlyToken });
      expect(result.allowed, `${method} ${route}`).toBe(false);
      if (!result.allowed && method === 'GET') {
        expect(result.response.headers.get('location')).toBe(code);
      }
    }
  });

  it('leaves the code step and the logout open after the password', async () => {
    for (const route of [code, logout]) {
      expect((await guard('GET', route, { cookieToken: passwordOnlyToken })).allowed).toBe(true);
      expect((await guard('POST', route, { cookieToken: passwordOnlyToken })).allowed).toBe(true);
    }
  });

  it('sends each state to its next page', () => {
    const base = { mustChangePassword: false };
    expect(landingPath({ ...base, totpSecret: null }, { factors: ['password'] })).toBe(setup);
    expect(landingPath({ ...base, totpSecret: 'x' }, { factors: ['password'] })).toBe(code);
    expect(landingPath({ ...base, totpSecret: 'x' }, { factors: ['password', 'totp'] })).toBe(
      '/admin/comptes',
    );
    expect(
      landingPath(
        { mustChangePassword: true, totpSecret: 'x' },
        { factors: ['password', 'recovery'] },
      ),
    ).toBe('/admin/mot-de-passe');
  });
});

describe('clientIp', () => {
  const request = new Request(origin, { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } });

  it('uses the socket address unless a proxy is trusted', () => {
    expect(clientIp(request, '192.0.2.1', testSettings)).toBe('192.0.2.1');
    expect(clientIp(request, undefined, testSettings)).toBe('unknown');
  });

  it('uses the last forwarded address behind a trusted proxy', () => {
    expect(clientIp(request, '192.0.2.1', { ...testSettings, trustProxy: true })).toBe('10.0.0.1');
  });
});
