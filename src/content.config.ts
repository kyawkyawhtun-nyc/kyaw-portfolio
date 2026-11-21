import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { projectHrefSchema } from './lib/project-href.mjs';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tools: z.array(z.string()),
    dataset: z.string(),
    links: z.array(
      z.object({
        label: z.string(),
        href: projectHrefSchema,
      }),
    ),
    image: z.string().optional(),
  }),
});

export const collections = { projects };
