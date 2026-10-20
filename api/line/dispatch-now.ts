export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = body.channelAccessToken?.trim() || process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const target = body.to?.trim() || process.env.LINE_GROUP_ID?.trim() || process.env.LINE_USER_ID?.trim();
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!token) {
    return res.status(400).json({ error: 'Missing LINE_CHANNEL_ACCESS_TOKEN in Vercel environment variables' });
  }

  if (!target) {
    return res.status(400).json({ error: 'Missing LINE_GROUP_ID or LINE_USER_ID in Vercel environment variables' });
  }

  if (!messages.length) {
    return res.status(400).json({ error: 'messages payload is required' });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: target,
        messages,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: responseText });
    }

    return res.status(200).send(responseText || JSON.stringify({ ok: true }));
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message || 'LINE push route failed',
    });
  }
}

