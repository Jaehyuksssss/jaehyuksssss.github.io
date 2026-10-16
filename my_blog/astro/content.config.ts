import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './contents',
    // Keep Gatsby URLs, including case and spaces. Do not slugify titles.
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    categories: z.array(z.string()),
    summary: z.string().default(''),
    thumbnail: z.string().default('/profile-image.png'),
  }),
})

export const collections = { posts }
