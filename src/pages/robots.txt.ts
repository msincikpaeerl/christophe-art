import type { APIRoute } from 'astro';

export const prerender = false;

/** Search engines may crawl the public site but not the admin area. */
export const robotsTxt = 'User-agent: *\nDisallow: /admin\n';

export const GET: APIRoute = () =>
  new Response(robotsTxt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
