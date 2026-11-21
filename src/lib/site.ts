/** Prefix an in-site path with Astro's base URL. External and hash URLs pass through. */
export function siteHref(path = ''): string {
  const base = import.meta.env.BASE_URL;
  if (path === '' || path === '/') return base;
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(path)) return path;
  return `${base}${path.replace(/^\/+/, '')}`;
}
