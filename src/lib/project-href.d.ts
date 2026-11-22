import type { ZodType } from 'astro/zod';

export function isAllowedProjectHref(href: string): boolean;

export const projectHrefSchema: ZodType<string>;

export function isAllowedProjectImage(image: string): boolean;

export const projectImageSchema: ZodType<string>;
