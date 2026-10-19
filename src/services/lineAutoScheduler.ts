import { DutyShift, FlexCardConfig, DEFAULT_FLEX_CARD_CONFIG } from '../types/roster';
import { isWeekendOrHoliday, HOSPITAL_INFO } from '../data/mockRosters';
import {
  buildGroupRosterFlexMessage,
  buildGroupRosterTextMessage,
  sendLinePushMessage,
  sendLineBroadcastMessage,
} from './lineApi';
import { saveNotificationLog, loadShiftsFromLocalStorage } from './googleSheetsDb';

export type AutoNotificationSlot = 'weekday_1555' | 'weekday_2000' | 'weekend_0755';

export interface BangkokTimeInfo {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  secondsStr: string; // ss
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isHolidayOrWeekend: boolean;
  thaiDayName: string;
}

export interface NextScheduledTriggerInfo {
  slot: AutoNotificationSlot;
  triggerTime: string;
  triggerDate: string;
  label: string;
  conditionDescription: string;
  isToday: boolean;
}

const STORAGE_KEY_AUTO_ENABLED = 'duty_line_auto_enabled_v1';
const STORAGE_KEY_SENT_HISTORY = 'duty_line_auto_sent_history_v1';

const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

/**
 * Get current time in Bangkok (Asia/Bangkok - UTC+7)
 */
export function getBangkokTime(baseDate: Date = new Date()): BangkokTimeInfo {
  const formatterDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatterDate.format(baseDate); // YYYY-MM-DD

  const formatterTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const [hours, minutes, seconds] = formatterTime.format(baseDate).split(':');
  const timeStr = `${hours}:${minutes}`;

  const formatterDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
  });
  const dayName = formatterDay.format(baseDate);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[dayName] ?? baseDate.getDay();

  const isHol = dayOfWeek === 0 || dayOfWeek === 6 || isWeekendOrHoliday(dateStr);

  return {
    dateStr,
    timeStr,
    secondsStr: seconds,
    dayOfWeek,
    isHolidayOrWeekend: isHol,
    thaiDayName: THAI_DAY_NAMES[dayOfWeek] || '',
  };
}

/**
 * Check if current Bangkok time matches any of the 3 specified conditions
 */
export function getActiveTriggerSlot(bkk: BangkokTimeInfo): AutoNotificationSlot | null {
  if (bkk.isHolidayOrWeekend) {
    // Condition 2: วันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 07:55 น.
    if (bkk.timeStr === '07:55') {
      return 'weekend_0755';
    }
  } else {
    // Condition 1: วันจันทร์ - ศุกร์
    // 1.1 เวลา 15:55 น. (กะบ่าย ครั้งที่ 1)
    if (bkk.timeStr === '15:55') {
      return 'weekday_1555';
    }
    // 1.2 เวลา 20:00 น. (ปิดกะบ่าย ครั้งที่ 2)
    if (bkk.timeStr === '20:00') {
      return 'weekday_2000';
    }
  }
  return null;
}

/**
 * Calculate the next upcoming scheduled trigger
 */
export function getNextScheduledTrigger(nowBkk: BangkokTimeInfo = getBangkokTime()): NextScheduledTriggerInfo {
  const currentMinutes = parseInt(nowBkk.timeStr.split(':')[0], 10) * 60 + parseInt(nowBkk.timeStr.split(':')[1], 10);

  if (nowBkk.isHolidayOrWeekend) {
    // Weekend/Holiday: Only 07:55 (475 mins)
    const triggerMin = 7 * 60 + 55;
    if (currentMinutes < triggerMin) {
      return {
        slot: 'weekend_0755',
        triggerTime: '07:55 น.',
        triggerDate: nowBkk.dateStr,
        label: 'เวรเช้าวันหยุด (07:55 น.)',
        conditionDescription: 'แจ้งเตือนก่อนเริ่มกะเช้า OT (08:30 - 16:30 น.)',
        isToday: true,
      };
    }
  } else {
    // Weekday: 15:55 (955 mins) and 20:00 (1200 mins)
    const min1555 = 15 * 60 + 55;
    const min2000 = 20 * 60;

    if (currentMinutes < min1555) {
      return {
        slot: 'weekday_1555',
        triggerTime: '15:55 น.',
        triggerDate: nowBkk.dateStr,
        label: 'กะบ่าย จันทร์-ศุกร์ ครั้งที่ 1 (15:55 น.)',
        conditionDescription: 'แจ้งเตือนก่อนเริ่มกะบ่าย 5 นาที พร้อมสรุปรายชื่อคนขึ้นเวร',
        isToday: true,
      };
    }
    if (currentMinutes < min2000) {
      return {
        slot: 'weekday_2000',
        triggerTime: '20:00 น.',
        triggerDate: nowBkk.dateStr,
        label: 'ปิดกะบ่าย จันทร์-ศุกร์ ครั้งที่ 2 (20:00 น.)',
        conditionDescription: 'แจ้งเตือนปิดกะบ่าย สรุปงานเอกสารยาและส่งมอบเวร',
        isToday: true,
      };
    }
  }

  // Next day calculation
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBkk = getBangkokTime(tomorrow);

  if (tomorrowBkk.isHolidayOrWeekend) {
    return {
      slot: 'weekend_0755',
      triggerTime: '07:55 น.',
      triggerDate: tomorrowBkk.dateStr,
      label: 'พรุ่งนี้: เวรเช้าวันหยุด (07:55 น.)',
      conditionDescription: 'แจ้งเตือนก่อนเริ่มกะเช้า OT (08:30 - 16:30 น.)',
      isToday: false,
    };
  } else {
    return {
      slot: 'weekday_1555',
      triggerTime: '15:55 น.',
      triggerDate: tomorrowBkk.dateStr,
      label: 'พรุ่งนี้: กะบ่าย จันทร์-ศุกร์ ครั้งที่ 1 (15:55 น.)',
      conditionDescription: 'แจ้งเตือนก่อนเริ่มกะบ่าย 5 นาที พร้อมสรุปรายชื่อคนขึ้นเวร',
      isToday: false,
    };
  }
}

/**
 * Check if this slot has already been sent today (Deduplication)
 */
export function hasSlotBeenSentToday(dateStr: string, slot: AutoNotificationSlot): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENT_HISTORY);
    if (!raw) return false;
    const history: Record<string, string> = JSON.parse(raw);
    const key = `${dateStr}_${slot}`;
    return Boolean(history[key]);
  } catch (e) {
    return false;
  }
}

/**
 * Mark a slot as sent for today
 */
export function markSlotAsSentToday(dateStr: string, slot: AutoNotificationSlot): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENT_HISTORY);
    const history: Record<string, string> = raw ? JSON.parse(raw) : {};
    const key = `${dateStr}_${slot}`;
    history[key] = new Date().toISOString();

    // Clean old entries (keep only last 60 days)
    const entries = Object.entries(history);
    if (entries.length > 60) {
      const trimmed = Object.fromEntries(entries.slice(entries.length - 60));
      localStorage.setItem(STORAGE_KEY_SENT_HISTORY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(STORAGE_KEY_SENT_HISTORY, JSON.stringify(history));
    }
  } catch (e) {
    console.warn('Failed saving auto sent history:', e);
  }
}

/**
 * Auto-scheduler state helper
 */
export function isAutoNotifierEnabled(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY_AUTO_ENABLED);
  return saved === null ? true : saved === 'true'; // Enabled by default
}

export function setAutoNotifierEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_AUTO_ENABLED, String(enabled));
}

/**
 * Execute automatic dispatch for a specific slot and date
 */
export async function executeAutoDispatch(
  slot: AutoNotificationSlot,
  targetDate: string,
  options: {
    shifts?: DutyShift[];
    channelAccessToken?: string;
    lineGroupId?: string;
    targetMode?: 'group' | 'broadcast' | 'user';
    messageMode?: 'flex' | 'text';
    flexConfig?: FlexCardConfig;
    isSimulation?: boolean;
  } = {}
): Promise<{ success: boolean; message: string; details?: any }> {
  const shifts = options.shifts || loadShiftsFromLocalStorage();
  const flexConfig = options.flexConfig || DEFAULT_FLEX_CARD_CONFIG;
  const targetMode = options.targetMode || 'group';
  const lineGroupId = options.lineGroupId || localStorage.getItem('duty_line_group_id') || 'C0123456789abcdef0123456789abcde';
  const messageMode = options.messageMode || 'flex';
  const token = options.channelAccessToken || localStorage.getItem('duty_line_channel_token') || '';

  // Filter shifts on this date
  const dayShifts = shifts.filter(s => s.date === targetDate);

  let slotTitle = '';
  let timingDetail = '';
  let triggerText = '';

  if (slot === 'weekday_1555') {
    slotTitle = flexConfig.weekday1555Title || '📢 แจ้งเตือนกะบ่าย (เวลา 15:55 น.) • วันจันทร์ - ศุกร์';
    timingDetail = flexConfig.weekday1555Desc || 'อีก 5 นาทีจะเริ่มเวลาปฏิบัติงานกะบ่าย (16:00 - 20:00 น.) ขอให้เจ้าหน้าที่เข้าปฏิบัติงานและตรวจเช็คเอกสารยา';
    triggerText = '15:55 น. (จันทร์-ศุกร์ ครั้งที่ 1)';
  } else if (slot === 'weekday_2000') {
    slotTitle = flexConfig.weekday2000Title || '📋 แจ้งเตือนปิดกะบ่าย & ส่งมอบเวร (เวลา 20:00 น.) • วันจันทร์ - ศุกร์';
    timingDetail = flexConfig.weekday2000Desc || 'สิ้นสุดเวลาปฏิบัติงานกะบ่าย 20:00 น. ขอให้สรุปยอดเอกสาร ปิดระบบ และลงบันทึกรายงานให้เรียบร้อย';
    triggerText = '20:00 น. (จันทร์-ศุกร์ ครั้งที่ 2)';
  } else {
    slotTitle = flexConfig.weekend0755Title || '🌅 แจ้งเตือนเวรเช้าวันหยุด (เวลา 07:55 น.) • เสาร์ - อาทิตย์ / นักขัตฤกษ์';
    timingDetail = flexConfig.weekend0755Desc || 'เวรวันหยุด เช้า OT (08:30 - 16:30 น.) บริหารจัดการคลังยา เอกสาร และเวชภัณฑ์';
    triggerText = '07:55 น. (เสาร์-อาทิตย์/นักขัตฤกษ์)';
  }

  const staffSummary = dayShifts.map(s => s.staffName).join(', ') || 'ไม่มีเจ้าหน้าที่ในวันนี้';

  const messages =
    messageMode === 'flex'
      ? [buildGroupRosterFlexMessage(dayShifts, targetDate, slotTitle, timingDetail, flexConfig)]
      : [{ type: 'text', text: buildGroupRosterTextMessage(dayShifts, targetDate, slotTitle, timingDetail, flexConfig) }];

  // Dispatch via LINE Messaging API
  let destinationName = '';
  try {
    if (options.isSimulation || !token.trim()) {
      // Simulation mode
      markSlotAsSentToday(targetDate, slot);
      saveNotificationLog({
        staffName: `[อัตโนมัติ] ${staffSummary}`,
        lineUserId: lineGroupId || 'AUTO_GROUP',
        shiftDate: targetDate,
        shiftName: slotTitle,
        triggerTimeText: `${triggerText} [AUTO]`,
        status: 'success',
        messageType: messageMode,
      });

      return {
        success: true,
        message: `[ส่งอัตโนมัติสำเร็จ] ส่งแจ้งเตือน ${triggerText} ประจำวันที่ ${targetDate} (เจ้าหน้าที่: ${staffSummary})`,
      };
    }

    if (targetMode === 'group') {
      destinationName = `กลุ่มไลน์ (${lineGroupId.substring(0, 8)}...)`;
      await sendLinePushMessage(token, lineGroupId.trim(), messages);
    } else if (targetMode === 'broadcast') {
      destinationName = 'Broadcast ทั้งแชนแนล';
      await sendLineBroadcastMessage(token, messages);
    } else {
      destinationName = 'User Push';
      await sendLinePushMessage(token, lineGroupId.trim(), messages);
    }

    // Mark as sent
    markSlotAsSentToday(targetDate, slot);

    // Save log
    saveNotificationLog({
      staffName: `[อัตโนมัติ] ${staffSummary}`,
      lineUserId: targetMode === 'group' ? lineGroupId : 'BROADCAST',
      shiftDate: targetDate,
      shiftName: slotTitle,
      triggerTimeText: `${triggerText} [AUTO]`,
      status: 'success',
      messageType: messageMode,
    });

    return {
      success: true,
      message: `ส่งแจ้งเตือนอัตโนมัติ [${triggerText}] เข้าสู่ ${destinationName} วันที่ ${targetDate} สำเร็จแล้ว!`,
    };
  } catch (err: any) {
    saveNotificationLog({
      staffName: `[อัตโนมัติ ผิดพลาด] ${staffSummary}`,
      lineUserId: lineGroupId,
      shiftDate: targetDate,
      shiftName: slotTitle,
      triggerTimeText: `${triggerText} [AUTO FAIL]`,
      status: 'failed',
      messageType: messageMode,
      error: err.message,
    });

    return {
      success: false,
      message: `ส่งแจ้งเตือนอัตโนมัติไม่สำเร็จ: ${err.message}`,
    };
  }
}
