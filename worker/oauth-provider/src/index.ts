// Minimaler GitHub-OAuth-Proxy für Decap CMS (self-hosted "github" backend), lauffähig als Cloudflare Worker.
// Ablauf: /auth leitet zu GitHub weiter -> /callback tauscht den Code gegen ein Access-Token
// und schickt es per postMessage an das Decap-CMS-Popup-Fenster zurück.

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

function renderCallbackPage(status: 'success' | 'error', payload: unknown) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(${JSON.stringify(message)}, e.origin);
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
  </body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
      authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set('scope', 'repo,user');
      authorizeUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(renderCallbackPage('error', { message: 'Missing code' }), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData: { access_token?: string; error?: string } = await tokenResponse.json();

      if (!tokenData.access_token) {
        return new Response(renderCallbackPage('error', { message: tokenData.error ?? 'No access token' }), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      return new Response(renderCallbackPage('success', { token: tokenData.access_token, provider: 'github' }), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
