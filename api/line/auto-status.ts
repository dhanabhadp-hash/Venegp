export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date();
  const bkkDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const bkkTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const bkkDayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
  }).format(now);

  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(bkkDayName);
  const isWeekendOrHoliday = dayOfWeek === 0 || dayOfWeek === 6 || ['2026-10-13', '2026-10-23'].includes(bkkDate);

  return res.status(200).json({
    success: true,
    bkkDate,
    bkkTime,
    dayOfWeek,
    isWeekendOrHoliday,
    hasServerSecret: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
    envGroupId: process.env.LINE_GROUP_ID || '',
  });
}
