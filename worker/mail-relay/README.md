# unsigned-mail-relay

Cloudflare Worker, der Formulardaten von der Website entgegennimmt und per E-Mail an den Verein weiterleitet — ohne die Daten dauerhaft zu speichern.

## Setup

```bash
cd worker/mail-relay
npm install -g wrangler   # falls noch nicht vorhanden
wrangler login
wrangler secret put RESEND_API_KEY
wrangler secret put DESTINATION_EMAIL     # z.B. unsignedhannover@gmail.com
wrangler secret put ALLOWED_ORIGIN        # z.B. https://unsigned-hannover.github.io
wrangler deploy
```

`wrangler deploy` gibt eine URL wie `https://unsigned-mail-relay.<subdomain>.workers.dev` aus. Diese URL als
`PUBLIC_FORM_ENDPOINT` in der `.env` der Website eintragen (siehe `.env.example` im Projekt-Root).

## Hinweis Absenderadresse

Resend verlangt eine verifizierte Absenderdomain. Für den Start kann alternativ `onboarding@resend.dev` als
`from`-Adresse genutzt werden (funktioniert ohne eigene Domain-Verifizierung, landet zuverlässig im Posteingang).
Sobald die Domain unsignedhannover.com verifiziert ist, kann auf eine eigene Absenderadresse umgestellt werden.
