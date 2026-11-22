import { z } from 'astro/zod';

/**
 * Project links may only be https URLs, root-relative paths, or same-page fragments.
 * Rejects javascript:, http:, data:, protocol-relative URLs, and anything else.
 * @param {string} href
 */
export function isAllowedProjectHref(href) {
  if (typeof href !== 'string' || href.length === 0) return false;
  // Browsers treat "\/", whitespace, and C0 controls in a path as off-site or normalized.
  if (/[\\\s\u0000-\u001f]/.test(href)) return false;
  if (href.startsWith('#')) return true;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  return href.startsWith('https://');
}

export const projectHrefSchema = z.string().refine(
  isAllowedProjectHref,
  'href must be an https:// URL, a root-relative / path, or a # fragment',
);

/**
 * Project images must be local asset paths with an allowed image extension.
 * Rejects schemes, protocol-relative URLs, path traversal, query/fragments, whitespace, and control chars.
 * @param {string} image
 */
export function isAllowedProjectImage(image) {
  if (typeof image !== 'string' || image.length === 0) return false;
  if (/[\\\s\u0000-\u001f?#:]/.test(image)) return false;
  if (image.includes('//') || image.includes('..')) return false;
  if (image.endsWith('/')) return false;
  return /^\/?[a-zA-Z0-9._/-]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(image);
}

export const projectImageSchema = z.string().refine(
  isAllowedProjectImage,
  'image must be a safe local path ending in .png, .jpg, .jpeg, .webp, .avif, or .svg',
);
