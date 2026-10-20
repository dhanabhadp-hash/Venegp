export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    hasServerSecret: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
    envGroupId: process.env.LINE_GROUP_ID || '',
    envUserId: process.env.LINE_USER_ID || '',
  });
}
