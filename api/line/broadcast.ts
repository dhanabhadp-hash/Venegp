export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = body.channelAccessToken?.trim() || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!token) {
    return res.status(400).json({
      error: 'Missing LINE_CHANNEL_ACCESS_TOKEN. Please configure it in Vercel Environment Variables.',
    });
  }

  if (!messages.length) {
    return res.status(400).json({
      error: 'Messages payload is required.',
    });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    });

    const text = await response.text();
    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = { message: text || 'LINE broadcast failed' };
      }

      return res.status(response.status).json({
        ok: false,
        ...errorBody,
      });
    }

    return res.status(response.status).send(text || JSON.stringify({ ok: true }));
  } catch (error: any) {
    console.error('LINE broadcast API error:', error);
    return res.status(500).json({
      error: error?.message || 'LINE broadcast request failed',
    });
  }
}
