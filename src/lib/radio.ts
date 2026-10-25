import { getCollection, type CollectionEntry } from 'astro:content';

export type RadioSet = CollectionEntry<'radio'>;

/** Alle sichtbaren Sets, neueste zuerst. */
export async function getSets(): Promise<RadioSet[]> {
  return (await getCollection('radio'))
    .filter((set) => !set.data.hidden)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatSetDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
}

/** Einbett-URL für den SoundCloud-Player. Wird erst nach Klick geladen (DSGVO). */
export function embedSrc(soundcloudUrl: string, visual = false): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&color=%23f25e0d&auto_play=true&visual=${visual}`;
}
