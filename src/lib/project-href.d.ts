import type { ZodType } from 'astro/zod';

export function isAllowedProjectHref(href: string): boolean;

export const projectHrefSchema: ZodType<string>;
