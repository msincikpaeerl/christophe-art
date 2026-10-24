import type { APIRoute } from 'astro';
import { recordActivity } from '../../server/admin/activity.ts';
import { endSessionByToken } from '../../server/admin/sessions.ts';
import { sessionCookieName } from '../../server/admin/settings.ts';
import { getDatabase } from '../../server/database.ts';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  const { db } = await getDatabase();
  const token = cookies.get(sessionCookieName)?.value;
  if (token) await endSessionByToken(db, token);
  const account = locals.admin.active?.account;
  if (account) {
    await recordActivity(db, { action: 'logout', actor: account.displayName, ip: locals.admin.ip });
  }
  cookies.delete(sessionCookieName, { path: '/admin' });
  return redirect('/admin/connexion', 303);
};
