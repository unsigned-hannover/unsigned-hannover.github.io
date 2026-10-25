// Holt alle Sets aus dem SoundCloud-RSS-Feed des Vereins und legt für jedes neue Set eine Markdown-Datei in
// src/content/radio/ an (plus Cover lokal unter public/radio/covers/). Bestehende Dateien werden nie überschrieben,
// d.h. Änderungen aus dem CMS (Genres, Beschreibung, Ausblenden) bleiben erhalten.
//
// Läuft ohne Abhängigkeiten mit Node >= 22:
//   node scripts/sync-soundcloud.mjs
//
// Konfiguration per Umgebungsvariable:
//   SOUNDCLOUD_RSS_URL      direkte Feed-URL (https://feeds.soundcloud.com/users/soundcloud:users:<id>/sounds.rss)
//   SOUNDCLOUD_PROFILE_URL  alternativ das Profil; die User-ID wird dann aus der Profilseite gelesen

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/radio');
const COVER_DIR = path.join(ROOT, 'public/radio/covers');
const COVER_PUBLIC = '/radio/covers';
const PROFILE_URL = process.env.SOUNDCLOUD_PROFILE_URL || 'https://soundcloud.com/unsignedhannover';

// Reihenfolge zählt: spezifische Spielarten zuerst, ihr Treffer wird danach aus dem Text entfernt, damit
// "Tech House" nicht zusätzlich als "House" zählt. Die Labels müssen zu den Optionen in public/admin/config.yml passen.
const GENRE_PATTERNS = [
  ['Deep House', /deep[\s-]?house/g],
  ['Tech House', /tech[\s-]?house/g],
  ['Melodic Techno', /melodic[\s-]?techno/g],
  ['Hard Techno', /hard[\s-]?techno/g],
  ['Drum & Bass', /drum\s*(?:&|and|n|'n')\s*bass|\bdnb\b|\bd&b\b/g],
  ['House', /\bhouse\b/g],
  ['Techno', /\btechno\b/g],
  ['Minimal', /\bminimal\b/g],
  ['Trance', /\btrance\b/g],
  ['Disco', /\b(?:nu[\s-]?)?disco\b/g],
  ['Electro', /\belectro\b/g],
  ['Breaks', /\bbreaks\b|\bbreakbeat\b/g],
  ['Ambient', /\bambient\b/g],
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(value) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
    .trim();
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1].trim()) : '';
}

function attr(xml, name, attribute) {
  const match = xml.match(new RegExp(`<${name}\\s[^>]*${attribute}="([^"]*)"`));
  return match ? decode(match[1]) : '';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function detectGenres(text) {
  let rest = text.toLowerCase();
  const found = [];
  for (const [label, pattern] of GENRE_PATTERNS) {
    if (rest.match(pattern)) {
      found.push(label);
      rest = rest.replace(pattern, ' ');
    }
  }
  return found;
}

// HH:MM:SS oder Sekunden -> "1:02:03" bzw. "58:12"
function normalizeDuration(value) {
  if (!value) return '';
  const parts = value.includes(':') ? value.split(':').map(Number) : [Number(value)];
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'unsigned-hannover-site-sync' } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.text();
}

async function resolveFeedUrl() {
  if (process.env.SOUNDCLOUD_RSS_URL) return process.env.SOUNDCLOUD_RSS_URL;
  const html = await fetchText(PROFILE_URL);
  const match = html.match(/soundcloud:\/\/users:(\d+)/) || html.match(/soundcloud:users:(\d+)/);
  if (!match) throw new Error(`Konnte die SoundCloud-User-ID nicht aus ${PROFILE_URL} lesen. SOUNDCLOUD_RSS_URL setzen.`);
  return `https://feeds.soundcloud.com/users/soundcloud:users:${match[1]}/sounds.rss`;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function knownTrackIds() {
  const ids = new Set();
  const urls = new Set();
  for (const file of await readdir(CONTENT_DIR).catch(() => [])) {
    if (!file.endsWith('.md')) continue;
    const source = await readFile(path.join(CONTENT_DIR, file), 'utf8');
    const id = source.match(/^soundcloudId:\s*"?(\d+)"?\s*$/m);
    if (id) ids.add(id[1]);
    const url = source.match(/^soundcloudUrl:\s*"?([^"\n]+)"?\s*$/m);
    if (url) urls.add(url[1].trim());
  }
  return { ids, urls };
}

async function downloadCover(url, id) {
  if (!url) return '';
  const file = path.join(COVER_DIR, `${id}.jpg`);
  if (await exists(file)) return `${COVER_PUBLIC}/${id}.jpg`;
  // SoundCloud liefert im Feed die 3000px-Version; 500px reicht für die Seite und hält das Repo klein.
  const candidates = [url.replace(/-t\d+x\d+\./, '-t500x500.'), url];
  for (const candidate of candidates) {
    const response = await fetch(candidate);
    if (!response.ok) continue;
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    return `${COVER_PUBLIC}/${id}.jpg`;
  }
  console.warn(`  Cover für ${id} nicht ladbar: ${url}`);
  return '';
}

function frontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === '' || value === undefined) continue;
    // JSON-Strings/-Arrays sind gültiges YAML und ersparen eigenes Escaping.
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

const feedUrl = await resolveFeedUrl();
console.log(`Feed: ${feedUrl}`);
const xml = await fetchText(feedUrl);
const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
console.log(`${items.length} Sets im Feed`);

await mkdir(CONTENT_DIR, { recursive: true });
await mkdir(COVER_DIR, { recursive: true });
const known = await knownTrackIds();
let created = 0;

for (const item of items) {
  const guid = tag(item, 'guid');
  const id = guid.match(/tracks\/(\d+)/)?.[1];
  const link = tag(item, 'link');
  if (!id || !link || known.ids.has(id) || known.urls.has(link)) continue;

  const title = tag(item, 'title');
  const date = new Date(tag(item, 'pubDate'));
  // SoundCloud füllt die Beschreibung ohne eigenen Text mit "<Titel> by <Profil>"; das lassen wir weg.
  const rawDescription = tag(item, 'description') || tag(item, 'itunes:summary');
  const description = rawDescription.startsWith(`${title} by `) ? '' : rawDescription;
  const isoDay = date.toISOString().slice(0, 10);

  let file = path.join(CONTENT_DIR, `${isoDay}-${slugify(title) || id}.md`);
  if (await exists(file)) file = file.replace(/\.md$/, `-${id}.md`);

  const cover = await downloadCover(attr(item, 'itunes:image', 'href'), id);
  await writeFile(
    file,
    frontmatter({
      title,
      date: date.toISOString(),
      soundcloudUrl: link,
      soundcloudId: id,
      duration: normalizeDuration(tag(item, 'itunes:duration')),
      cover,
      genres: detectGenres(`${title} ${description}`),
      description,
    })
  );
  known.ids.add(id);
  created++;
  console.log(`  + ${path.basename(file)}`);
}

console.log(created ? `${created} neue Sets angelegt.` : 'Keine neuen Sets.');
