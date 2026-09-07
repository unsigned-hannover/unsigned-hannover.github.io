export interface Env {
  RESEND_API_KEY: string;
  DESTINATION_EMAIL: string;
  ALLOWED_ORIGIN: string;
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers });
    }

    // Honeypot: Bots füllen "company" meist aus -> still verwerfen, kein Fehler an den Client.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const { formType, name, email, message, membershipType } = body;

    if (typeof name !== 'string' || !name.trim() || !isValidEmail(email) || typeof message !== 'string' || !message.trim()) {
      return new Response('Missing or invalid fields', { status: 400, headers });
    }

    const subject =
      formType === 'membership'
        ? `Neuer Mitgliedsantrag (${typeof membershipType === 'string' ? membershipType : 'unbekannt'}) von ${name}`
        : `Neue Kontaktanfrage von ${name}`;

    const text = [
      `Formular: ${formType === 'membership' ? 'Mitgliedsantrag' : 'Kontakt'}`,
      `Name: ${name}`,
      `E-Mail: ${email}`,
      formType === 'membership' ? `Mitgliedschaft: ${membershipType}` : null,
      '',
      message,
    ]
      .filter(Boolean)
      .join('\n');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'UNSIGNED. Website <formular@unsignedhannover.com>',
        to: [env.DESTINATION_EMAIL],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!resendResponse.ok) {
      return new Response('Mail delivery failed', { status: 502, headers });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },
};
