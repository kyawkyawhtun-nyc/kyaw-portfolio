/** Base path with a trailing slash, whatever Astro stored in BASE_URL. */
export function siteBase(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** Prefix an in-site path with Astro's base URL. External and hash URLs pass through. */
export function siteHref(path = ''): string {
  const base = siteBase();
  if (path === '' || path === '/') return base;
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(path)) return path;
  return `${base}${path.replace(/^\/+/, '')}`;
}

/** Absolute URL for a site path, using the configured site origin and base. */
export function absoluteUrl(path: string, site: URL): string {
  return new URL(siteHref(path), site).href;
}

export function isHomePath(pathname: string): boolean {
  const withSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);
  return withSlash(pathname) === siteBase();
}

/** Home section links stay on the page. Other pages point back at the home anchor. */
export function sectionHref(pathname: string, id: string): string {
  return isHomePath(pathname) ? `#${id}` : `${siteBase()}#${id}`;
}
