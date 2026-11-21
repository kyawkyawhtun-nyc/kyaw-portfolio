/**
 * Public contact address.
 * TODO(owner): pending confirmation that this is the address to publish.
 */
export const PUBLIC_EMAIL = 'kyawkyawhtun.mdy@gmail.com';

export const GITHUB_URL = 'https://github.com/kyawkyawhtun-nyc';

export const GITHUB_LABEL = 'github.com/kyawkyawhtun-nyc';

/** TODO(owner): LinkedIn profile URL. Empty until the owner supplies it. */
export const LINKEDIN_URL = '';

export const LINKEDIN_PLACEHOLDER_LABEL = 'TODO(owner): LinkedIn URL';

/** Numeric character references so the built HTML does not contain the address as plain text. */
export function entityEncode(value: string): string {
  return Array.from(value, (character) => `&#${character.codePointAt(0)};`).join('');
}
