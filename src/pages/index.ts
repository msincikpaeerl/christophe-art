import type { APIRoute } from 'astro';
import { negotiateLocale } from '../i18n/index.ts';

// The only address that redirects according to the browser language.
export const GET: APIRoute = ({ request }) => {
  const locale = negotiateLocale(request.headers.get('accept-language'));
  return new Response(null, {
    status: 302,
    headers: { Location: `/${locale}/`, Vary: 'Accept-Language' },
  });
};
