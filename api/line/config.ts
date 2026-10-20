export const config = {
  runtime: 'nodejs',
};

const DEFAULT_SHEET_ID = '1DzH6jwgFhDiRSylIv6RYODugMpXrp_n_A0q4jfp_jZg';
const HOLIDAY_DATES = ['2026-10-13', '2026-10-23'];

type AutoNotificationSlot = 'weekday_1555' | 'weekday_2000' | 'weekend_0755';

type DutyShift = {
  id: string;
  date: string;
  staffName: string;
  shiftType: 'morning' | 'afternoon';
  shiftName: string;
  startTime: string;
  endTime: string;
  department: string;
  location?: string;
  notes?: string;
  lineUserId?: string;
  phone?: string;
  status?: string;
};

function getBangkokNow(date = new Date()) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
  });

  const dateStr = dateFormatter.format(date);
  const timeStr = timeFormatter.format(date);
  const [hours, minutes] = timeStr.split(':');
  const compactTime = `${hours}:${minutes}`;

  const dayName = dayFormatter.format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[dayName] ?? date.getDay();
  const isWeekendOrHoliday = dayOfWeek === 0 || dayOfWeek === 6 || HOLIDAY_DATES.includes(dateStr);

  return { dateStr, compactTime, dayOfWeek, isWeekendOrHoliday, now: new Date(date) };
}

function getCurrentSlot(date = new Date()): AutoNotificationSlot | null {
  const { compactTime, isWeekendOrHoliday } = getBangkokNow(date);

  if (isWeekendOrHoliday) {
    if (compactTime === '07:55') return 'weekend_0755';
    return null;
  }

  if (compactTime === '15:55') return 'weekday_1555';
  if (compactTime === '20:00') return 'weekday_2000';
  return null;
}

function parseGoogleSheetCSV(csvText: string): DutyShift[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
  }

  let headerRowIndex = -1;
  const dayColMap: Record<number, number> = {};

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let count = 0;

    row.forEach((cell, cIdx) => {
      const match = cell.match(/^(\d{1,2})/);
      if (match) {
        const day = parseInt(match[1], 10);
        if (day >= 1 && day <= 31) {
          dayColMap[day] = cIdx;
          count++;
        }
      }
    });

    if (count >= 15) {
      headerRowIndex = r;
      break;
    }
  }

  const shifts: DutyShift[] = [];

  if (headerRowIndex === -1) return shifts;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[1] || '').trim();
    const role = (row[2] || '').trim();

    if (!name || name.includes('รวม') || name.includes('ผู้จัดเวร') || name.includes('ผู้ตรวจสอบ')) {
      continue;
    }

    for (let d = 1; d <= 31; d++) {
      const cIdx = dayColMap[d];
      if (cIdx === undefined || cIdx >= row.length) continue;

      const val = (row[cIdx] || '').trim();
      if (!val || val === '-' || val === '0') continue;

      const isMorning = val.includes('เช้า') || val.includes('08:30');
      const startTime = isMorning ? '08:30' : '16:00';
      const endTime = isMorning ? '16:30' : '20:00';
      const date = `2026-10-${String(d).padStart(2, '0')}`;

      shifts.push({
        id: `server-${r}-${d}`,
        date,
        staffName: name,
        shiftType: isMorning ? 'morning' : 'afternoon',
        shiftName: val,
        startTime,
        endTime,
        department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
        notes: `${role} • งานเอกสารและจ่ายยา OT`,
        status: 'confirmed',
      });
    }
  }

  return shifts;
}

async function fetchRosterForToday(dateStr: string): Promise<DutyShift[]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/export?format=csv`;
  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(`Google Sheet fetch failed: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const allShifts = parseGoogleSheetCSV(csvText);
  return allShifts.filter(shift => shift.date === dateStr);
}

function buildNotificationText(slot: AutoNotificationSlot, dateStr: string, shifts: DutyShift[]): string {
  const list = shifts
    .map((shift, index) => `${index + 1}. ${shift.staffName} (${shift.shiftName})`)
    .join('\n');

  const header: Record<AutoNotificationSlot, string> = {
    weekday_1555: '📢 แจ้งเตือนกะบ่าย (15:55 น.)',
    weekday_2000: '📋 แจ้งเตือนปิดกะบ่ายและส่งมอบเวร (20:00 น.)',
    weekend_0755: '🌅 แจ้งเตือนเวรเช้าวันหยุด (07:55 น.)',
  };

  const body: Record<AutoNotificationSlot, string> = {
    weekday_1555: 'อีก 5 นาทีจะเริ่มกะบ่าย 16:00 - 20:00 น. กรุณาเตรียมพร้อมและดำเนินงานตามเวรกำหนด',
    weekday_2000: 'สิ้นสุดกะบ่าย 20:00 น. กรุณาสรุปยอดงานและส่งมอบเวรให้เรียบร้อย',
    weekend_0755: 'เวรวันหยุดเช้า 08:30 - 16:30 น. กรุณาตรวจสอบเวรและเตรียมพร้อมก่อนเริ่มงาน',
  };

  return `${header[slot]}\nวันที่: ${dateStr}\n\n${body[slot]}\n\nรายชื่อผู้ปฏิบัติงาน:\n${list || 'ไม่มีผู้ปฏิบัติงานในวันที่นี้'}`;
}

async function sendLineTextMessage(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const target = process.env.LINE_GROUP_ID?.trim() || process.env.LINE_USER_ID?.trim();

  if (!token) {
    throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  }

  if (!target) {
    throw new Error('Missing LINE_GROUP_ID or LINE_USER_ID');
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: target,
      messages: [{ type: 'text', text }],
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`LINE push failed: ${response.status} ${responseText}`);
  }

  return { ok: true, responseText };
}

async function getDedupKey(dateStr: string, slot: AutoNotificationSlot) {
  return `line:sent:${dateStr}:${slot}`;
}

async function isAlreadySent(dateStr: string, slot: AutoNotificationSlot): Promise<boolean> {
  const key = await getDedupKey(dateStr, slot);
  const value = await fetch(`${process.env.KV_REST_API_URL || ''}/set?key=${encodeURIComponent(key)}&value=sent`, {
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN || ''}`,
    },
  }).then(() => false).catch(() => false);

  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return false;
    }

    const res = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json();
    return Boolean(data?.result || data?.value || data?.data);
  } catch (error) {
    console.warn('KV read failed:', error);
    return false;
  }
}

async function markSent(dateStr: string, slot: AutoNotificationSlot) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return;
    }

    const key = await getDedupKey(dateStr, slot);
    await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
      body: JSON.stringify({ value: 'sent', ttl: 86400 }),
    });
  } catch (error) {
    console.warn('KV write failed:', error);
  }
}

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method && req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const now = new Date();
    const { dateStr, compactTime } = getBangkokNow(now);
    const slot = getCurrentSlot(now);

    if (!slot) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'No scheduled slot at this time',
        now: `${dateStr} ${compactTime}`,
      });
    }

    if (await isAlreadySent(dateStr, slot)) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'Already sent for this slot today',
        slot,
        dateStr,
      });
    }

    const shifts = await fetchRosterForToday(dateStr);
    if (!shifts.length) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'No roster data for this date',
        slot,
        dateStr,
      });
    }

    const message = buildNotificationText(slot, dateStr, shifts);
    await sendLineTextMessage(message);
    await markSent(dateStr, slot);

    return res.status(200).json({
      success: true,
      sent: true,
      slot,
      dateStr,
      count: shifts.length,
      preview: message.slice(0, 200),
    });
  } catch (error: any) {
    console.error('LINE_CRON_ERROR', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'LINE dispatch failed',
    });
  }
}

