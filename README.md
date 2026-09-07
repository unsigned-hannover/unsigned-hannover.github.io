# unsignedhannover.com

Website des Kulturverein UNSIGNED. e.V. (Hannover). Statisch gebaut mit [Astro](https://astro.build) +
[Tailwind CSS](https://tailwindcss.com), Content über [Decap CMS](https://decapcms.org) pflegbar, Hosting über
GitHub Pages.

## Projektstruktur

```
src/
  content.config.ts        Schema für Events, Radio-Folgen, Statistiken
  content/
    events/*.md             Ein Event pro Datei (Titel, Datum, Ort, ...)
    radio/*.md               Eine Podcast-Folge pro Datei (Titel, SoundCloud-Link, ...)
    site/stats.json          Zahlen für den Statistik-Block auf der Startseite
  components/                Wiederverwendbare Bausteine (Header, EventCard, Formular, ...)
  layouts/Layout.astro        Grundgerüst (Head, Header, Footer) für alle Seiten
  pages/                      Eine Datei = eine Route (/, /radio/, /kulturverein/, ...)
  styles/global.css           Komplettes Design-System ("Signal"): Farben, Fonts, HUD-Bausteine, Animationen
public/
  admin/                      Decap-CMS-Oberfläche unter /admin
worker/
  mail-relay/                 Cloudflare Worker: Formulare -> E-Mail (siehe eigenes README)
  oauth-provider/              Cloudflare Worker: GitHub-Login fürs CMS (siehe eigenes README)
```

## Lokal entwickeln

```sh
npm install
npm run dev        # http://localhost:4321
npm run build       # Production-Build nach ./dist
npm run preview     # Build lokal ansehen
```

## Content pflegen

**Ohne CMS:** Dateien in `src/content/events/` bzw. `src/content/radio/` anlegen/bearbeiten (Markdown mit
Frontmatter), committen, pushen — die Seite baut sich automatisch neu.

**Mit CMS:** Unter `/admin` auf der deployten Seite einloggen (GitHub-Login). Voraussetzung: der OAuth-Worker aus
`worker/oauth-provider/` ist deployt und in `public/admin/config.yml` unter `backend.base_url` eingetragen, und
`backend.repo` in derselben Datei zeigt auf das echte GitHub-Repo.

## Formulare aktivieren

Ohne konfigurierten Endpoint zeigen die Formulare eine Fallback-Meldung ("bitte per E-Mail wenden"). Zum Aktivieren:

1. `worker/mail-relay/` deployen (siehe dortiges README).
2. Die ausgegebene Worker-URL als `PUBLIC_FORM_ENDPOINT` in `.env` (lokal) und als Repository-Variable
   `PUBLIC_FORM_ENDPOINT` unter GitHub → Settings → Secrets and variables → Actions → Variables eintragen (wird vom
   Deploy-Workflow in den Production-Build eingebaut).

## Deployment

Push auf `main` löst `.github/workflows/deploy.yml` aus: Build + Deploy nach GitHub Pages. Einmalig in den
Repo-Settings unter „Pages" die Quelle auf „GitHub Actions" stellen.

`astro.config.mjs` → `site` muss zur tatsächlichen Pages-URL passen (aktuell Platzhalter
`https://unsigned-hannover.github.io` — am einfachsten das Repo so nennen, dann läuft die Seite ohne Unterpfad).
Domain-Umzug auf unsignedhannover.com später per CNAME, ohne Codeänderung.

## Design-Varianten (temporär)

Es gibt aktuell **zwei** Varianten, umschaltbar über den Switcher rechts in der Navigation
(gespeichert in `localStorage`, Schlüssel `unsigned-variant`):

- **Signal** — Broadcast-/Sendekonsolen-Look (siehe unten)
- **Editorial** — Umsetzung der Figma-Vorlage: Barlow Condensed + DM Sans, Foto-Hero mit
  Verlauf und orangem Akzentbalken, Termine mit Datumsblock und Kategorie-Tags, orange
  Vollflächen-CTA, klassischer Spalten-Footer

Beide Varianten liegen parallel im Markup (`.v-signal` / `.v-editorial`) und werden per CSS
umgeschaltet. Sobald eine Richtung feststeht: jeweils andere Variante samt Switcher entfernen.

Die Fotos unter `public/img/` sind **Platzhalter** (Unsplash, lokal gespeichert, damit kein
externer Request rausgeht) — vor Go-Live durch eigene Vereinsfotos ersetzen.

## Design

Visuelle Richtung „Signal": Broadcast-/Sendekonsolen-Ästhetik — Glitch-Typografie (RGB-Split), Scanlines,
Film-Grain-Canvas, HUD-Module mit Eckklammern, Oszilloskop-Grafik im Radio-Player, Laufband + Live-Uhr im Header.
Schriften: Archivo Black (Display) und Space Mono (alles andere), beide via Fontsource lokal ausgeliefert — keine
Verbindung zu Google-CDNs. Alle Animationen respektieren `prefers-reduced-motion`.

Der SoundCloud-Player lädt bewusst erst nach Klick auf Play (DSGVO); bis dahin läuft nur die lokale
Canvas-Oszilloskop-Grafik, es geht kein Request an SoundCloud raus.

## Rechtstexte

Impressum und Datenschutzerklärung (`src/pages/impressum.astro`, `src/pages/datenschutzerklaerung.astro`) wurden
inhaltlich vom bisherigen Baukasten übernommen bzw. an die neue technische Basis angepasst. Vor Go-Live vom
Vorstand / einer Rechtsberatung final gegenlesen lassen.
