export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = body.channelAccessToken?.trim() || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const target = body.to?.trim() || process.env.LINE_GROUP_ID || process.env.LINE_USER_ID || '';
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!token) {
    return res.status(400).json({
      error: 'Missing LINE_CHANNEL_ACCESS_TOKEN. Please configure it in Vercel Environment Variables.',
    });
  }

  if (!target) {
    return res.status(400).json({
      error: 'Missing LINE destination (to). Please configure LINE_GROUP_ID or LINE_USER_ID.',
    });
  }

  if (!messages.length) {
    return res.status(400).json({
      error: 'Messages payload is required.',
    });
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

    const text = await response.text();
    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = { message: text || 'LINE push failed' };
      }

      return res.status(response.status).json({
        ok: false,
        ...errorBody,
      });
    }

    return res.status(response.status).send(text || JSON.stringify({ ok: true }));
  } catch (error: any) {
    console.error('LINE push API error:', error);
    return res.status(500).json({
      error: error?.message || 'LINE push request failed',
    });
  }
}
