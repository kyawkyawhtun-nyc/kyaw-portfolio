/**
 * Email remains disabled at the owner's request. Contact is through GitHub.
 */
export const PUBLIC_EMAIL: string = '';

export const GITHUB_URL = 'https://github.com/kyawkyawhtun-nyc';

export const GITHUB_LABEL = 'github.com/kyawkyawhtun-nyc';

/** TODO(owner): LinkedIn profile URL. Empty until the owner supplies it. */
export const LINKEDIN_URL: string = '';

/** Escape HTML special characters before interpolating untrusted or plain text into an HTML string. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Numeric character references so the built HTML does not contain the address as plain text. */
export function entityEncode(value: string): string {
  return Array.from(value, (character) => `&#${character.codePointAt(0)};`).join('');
}
