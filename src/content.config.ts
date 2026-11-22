import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { projectHrefSchema } from './lib/project-href.mjs';

const metric = z.object({
  value: z.string(),
  label: z.string(),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    summary: z.string(),
    lede: z.string(),
    year: z.string(),
    meta: z.string(),
    dataset: z.string(),
    tools: z.array(z.string()),
    order: z.number(),
    featured: z.boolean().default(false),
    badge: z.string().optional(),
    cardMetrics: z.array(metric).min(1),
    metrics: z.array(metric).min(1),
    links: z.array(
      z.object({
        label: z.string(),
        href: projectHrefSchema.optional(),
        placeholder: z.boolean().optional(),
        variant: z.enum(['primary', 'secondary']).default('primary'),
      }),
    ),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { projects };
