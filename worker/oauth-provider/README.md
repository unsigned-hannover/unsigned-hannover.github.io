# unsigned-oauth

Kleiner GitHub-OAuth-Proxy, den Decap CMS (`/admin`) für den Login braucht. Nötig, weil GitHub OAuth einen
Server-Baustein für den Token-Tausch verlangt — GitHub Pages selbst kann das nicht (rein statisch).

## Setup

1. GitHub OAuth App anlegen: https://github.com/settings/developers → "New OAuth App"
   - Homepage URL: `https://<username-oder-org>.github.io/<repo>/`
   - Authorization callback URL: `https://unsigned-oauth.<subdomain>.workers.dev/callback`
2. Client-ID und Client-Secret als Worker-Secrets hinterlegen:

```bash
cd worker/oauth-provider
wrangler login
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler deploy
```

3. Die ausgegebene Worker-URL (ohne `/callback`) in `public/admin/config.yml` unter `backend.base_url` eintragen.
4. In der GitHub-Repo-Zugriffsliste sicherstellen, dass nur Vorstand/Redaktion Schreibrechte auf das Repo hat —
   darüber steuert sich, wer sich im CMS einloggen und Inhalte ändern kann.
