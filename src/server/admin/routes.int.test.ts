import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminRoutes, publicAdminRoutes } from '../../test-support/admin-routes.ts';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { adminAccounts } from '../schema.ts';
import { createAccount } from './accounts.ts';
import { clientIp, guardAdminRequest, isAdminPath } from './guard.ts';
import { createSession } from './sessions.ts';
import { testSettings } from './test-settings.ts';

const origin = 'https://site.example.test';
const publicRoutes = publicAdminRoutes;

let testDb: TestDatabase;
let token = '';
let mustChangeToken = '';

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
  if (!ready.ok || !fresh.ok) throw new Error('setup failed');
  await testDb.db
    .update(adminAccounts)
    .set({ mustChangePassword: false })
    .where(eq(adminAccounts.id, ready.account.id));
  const options = { factors: ['password'], userAgent: 'test', ip: '::1' };
  token = (await createSession(testDb.db, { accountId: ready.account.id, ...options })).token;
  mustChangeToken = (await createSession(testDb.db, { accountId: fresh.account.id, ...options }))
    .token;
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
