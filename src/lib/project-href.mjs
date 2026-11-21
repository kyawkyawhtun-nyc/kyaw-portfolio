import { z } from 'astro/zod';

/**
 * Project links may only be https URLs, root-relative paths, or same-page fragments.
 * Rejects javascript:, http:, data:, protocol-relative URLs, and anything else.
 * @param {string} href
 */
export function isAllowedProjectHref(href) {
  if (typeof href !== 'string' || href.length === 0) return false;
  if (href.startsWith('#')) return true;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  return href.startsWith('https://');
}

export const projectHrefSchema = z.string().refine(
  isAllowedProjectHref,
  'href must be an https:// URL, a root-relative / path, or a # fragment',
);
