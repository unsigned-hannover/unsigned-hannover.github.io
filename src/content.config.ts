import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    location: z.string(),
    poster: z.string().optional(),
    ticketUrl: z.string().url().optional(),
    description: z.string().optional(),
    hidden: z.boolean().default(false),
  }),
});

const radio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/radio' }),
  // Wird von scripts/sync-soundcloud.mjs aus dem SoundCloud-RSS-Feed befüllt, danach im CMS editierbar.
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    soundcloudUrl: z.string().url(),
    soundcloudId: z.coerce.string().optional(),
    duration: z.string().optional(),
    cover: z.string().optional(),
    genres: z.array(z.string()).default([]),
    description: z.string().optional(),
    hidden: z.boolean().default(false),
  }),
});

const stats = defineCollection({
  loader: file('./src/content/site/stats.json'),
  schema: z.object({
    events: z.number(),
    listeners: z.string(),
    guests: z.string(),
  }),
});

export const collections = { events, radio, stats };
