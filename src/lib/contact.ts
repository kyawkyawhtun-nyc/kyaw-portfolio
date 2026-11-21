/** Placeholder address only. Not a real person. */
export const PLACEHOLDER_EMAIL = 'your.name@example.com';

export const LINKEDIN_PLACEHOLDER = 'https://www.linkedin.com/in/your-name';

/** Numeric character references so the built HTML does not contain the address as plain text. */
export function entityEncode(value: string): string {
  return Array.from(value, (character) => `&#${character.codePointAt(0)};`).join('');
}
