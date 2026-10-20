export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = body.channelAccessToken?.trim() || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  if (!token) {
    return res.status(400).json({
      error: 'Missing LINE_CHANNEL_ACCESS_TOKEN. Please configure it in Vercel Environment Variables.',
    });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('LINE test API error:', error);
    return res.status(500).json({
      error: error?.message || 'LINE test request failed',
    });
  }
}
