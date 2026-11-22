import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/site';

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('site in astro.config.mjs is required to build robots.txt.');
  }

  const sitemap = absoluteUrl('sitemap.xml', site);
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
