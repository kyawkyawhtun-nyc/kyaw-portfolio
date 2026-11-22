import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { absoluteUrl } from '../lib/site';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Static routes plus one URL per project. The 404 page is not listed. */
export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('site in astro.config.mjs is required to build the sitemap.');
  }

  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const paths = ['', 'about/', 'projects/', ...projects.map((project) => `projects/${project.id}/`)];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path, site))}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
