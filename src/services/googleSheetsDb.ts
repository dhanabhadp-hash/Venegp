import { DutyShift, NotificationLog } from '../types/roster';
import { HOSPITAL_INFO } from '../data/mockRosters';

const STORAGE_KEY_SHIFTS = 'duty_shifts_database_v2';
const STORAGE_KEY_CONFIG = 'duty_sheets_db_config_v2';
const STORAGE_KEY_LOGS = 'duty_sheets_notification_logs_v2';
const STORAGE_KEY_SETTINGS = 'duty_user_settings_v2';

export interface GoogleSheetsDbConfig {
  spreadsheetUrl: string;
  spreadsheetId: string;
  appsScriptUrl?: string;
  lastSyncTime?: string;
  autoSyncOnOpen: boolean;
  dbStatus: 'connected' | 'offline' | 'error';
  lastError?: string;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function getDefaultDbConfig(): GoogleSheetsDbConfig {
  return {
    spreadsheetUrl: HOSPITAL_INFO.spreadsheetUrl,
    spreadsheetId: extractSpreadsheetId(HOSPITAL_INFO.spreadsheetUrl),
    appsScriptUrl: '',
    autoSyncOnOpen: true,
    dbStatus: 'connected',
  };
}

export function loadDbConfig(): GoogleSheetsDbConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return { ...getDefaultDbConfig(), ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse sheets db config:', e);
  }
  return getDefaultDbConfig();
}

export function saveDbConfig(config: Partial<GoogleSheetsDbConfig>): GoogleSheetsDbConfig {
  const current = loadDbConfig();
  const updated: GoogleSheetsDbConfig = {
    ...current,
    ...config,
    spreadsheetId: extractSpreadsheetId(config.spreadsheetUrl || current.spreadsheetUrl),
  };
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
  return updated;
}

// 1. Fetch shifts directly from Google Sheets
export async function fetchShiftsFromGoogleSheets(
  sheetUrlOrId?: string
): Promise<{ shifts: DutyShift[]; title: string; count: number }> {
  const config = loadDbConfig();
  const target = sheetUrlOrId || config.spreadsheetUrl || HOSPITAL_INFO.spreadsheetUrl;
  const sheetId = extractSpreadsheetId(target);

  try {
    // Priority 1: Use server proxy endpoint
    const response = await fetch(`/api/sheet/data?url=${encodeURIComponent(target)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.shifts) && data.shifts.length > 0) {
        saveShiftsToLocalStorage(data.shifts);
        saveDbConfig({
          lastSyncTime: new Date().toISOString(),
          dbStatus: 'connected',
          lastError: undefined,
        });
        return {
          shifts: data.shifts,
          title: data.title || 'ตารางเวร โรงพยาบาลสบปราบ',
          count: data.shifts.length,
        };
      }
    }
  } catch (err: any) {
    console.warn('Backend proxy fetch failed, attempting client-side fallback:', err);
  }

  // Priority 2: Client-side public CSV fetch
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const csvText = await res.text();
      const parsedShifts = parseGoogleSheetCSV(csvText);
      if (parsedShifts.length > 0) {
        saveShiftsToLocalStorage(parsedShifts);
        saveDbConfig({
          lastSyncTime: new Date().toISOString(),
          dbStatus: 'connected',
          lastError: undefined,
        });
        return {
          shifts: parsedShifts,
          title: 'ตารางเวร โรงพยาบาลสบปราบ (CSV Feed)',
          count: parsedShifts.length,
        };
      }
    }
  } catch (err: any) {
    console.warn('Client CSV fetch failed:', err);
  }

  // Priority 3: Fallback to existing local storage cache
  const cached = loadShiftsFromLocalStorage();
  if (cached.length > 0) {
    return {
      shifts: cached,
      title: 'ตารางเวรจากหน่วยความจำแคชฐานข้อมูล',
      count: cached.length,
    };
  }

  throw new Error('ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบลิงก์หรือสิทธิ์การเข้าถึง');
}

// Client-side CSV Parser for Google Sheets
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
      if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
  }

  let headerRowIdx = -1;
  const dayColMap: { [day: number]: number } = {};

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let count = 0;
    row.forEach((cell, cIdx) => {
      const numMatch = cell.match(/^(\d{1,2})/);
      if (numMatch) {
        const d = parseInt(numMatch[1], 10);
        if (d >= 1 && d <= 31) {
          dayColMap[d] = cIdx;
          count++;
        }
      }
    });
    if (count >= 15) {
      headerRowIdx = r;
      break;
    }
  }

  const shifts: DutyShift[] = [];
  const staffLineMap: { [name: string]: { lineUserId: string; phone: string } } = {
    'น.ส.กนกวรรณ ศรีจันทร์': { lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', phone: '081-456-7890' },
    'นางปริยากร หล้าภู': { lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', phone: '089-123-4567' },
    'นางรุ่งนภา ถึงทุ่ง': { lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8', phone: '086-789-0123' },
    'นายธนาพัทธ์ ปงกา': { lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9', phone: '084-567-8901' },
  };

  if (headerRowIdx !== -1) {
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const name = (row[1] || '').trim();
      const role = (row[2] || '').trim();
      if (!name || name.includes('รวม') || name.includes('ผู้จัดเวร') || name.includes('ผู้ตรวจสอบ')) continue;

      const staffMeta = staffLineMap[name] || { lineUserId: '', phone: '' };

      for (let d = 1; d <= 31; d++) {
        const cIdx = dayColMap[d];
        if (cIdx !== undefined && cIdx < row.length) {
          const val = (row[cIdx] || '').trim();
          if (val && val !== '-' && val !== '0') {
            const isMorning = val.includes('เช้า') || val.includes('08:30');
            const startTime = isMorning ? '08:30' : '16:00';
            const endTime = isMorning ? '16:30' : '20:00';
            const dateStr = `2026-10-${String(d).padStart(2, '0')}`;

            shifts.push({
              id: `sheet-${r}-${d}`,
              date: dateStr,
              staffName: name,
              shiftType: isMorning ? 'morning' : 'afternoon',
              shiftName: val,
              startTime,
              endTime,
              department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
              lineUserId: staffMeta.lineUserId,
              phone: staffMeta.phone,
              notes: `${role} • งานเอกสารและจ่ายยา OT`,
              status: 'confirmed',
            });
          }
        }
      }
    }
  }

  return shifts;
}

// 2. Local Storage DB persistence
export function saveShiftsToLocalStorage(shifts: DutyShift[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
  } catch (e) {
    console.error('Failed to save shifts to local storage:', e);
  }
}

export function loadShiftsFromLocalStorage(): DutyShift[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHIFTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load shifts from local storage:', e);
  }
  return [];
}

// 3. Export to CSV string
export function exportShiftsToCSV(shifts: DutyShift[]): string {
  const headers = [
    'ID',
    'วันที่ (Date)',
    'ชื่อเจ้าหน้าที่ (Staff Name)',
    'กะเวร (Shift Type)',
    'ชื่อเวร (Shift Name)',
    'เวลาเริ่ม (Start Time)',
    'เวลาสิ้นสุด (End Time)',
    'แผนก (Department)',
    'สถานที่ (Location)',
    'LINE User ID',
    'เบอร์โทรศัพท์ (Phone)',
    'หมายเหตุ (Notes)',
    'สถานะ (Status)',
  ];

  const rows = shifts.map(s => [
    `"${s.id}"`,
    `"${s.date}"`,
    `"${s.staffName}"`,
    `"${s.shiftType === 'morning' ? 'เช้า OT' : 'บ่าย 4 ชม. OT'}"`,
    `"${s.shiftName}"`,
    `"${s.startTime}"`,
    `"${s.endTime}"`,
    `"${s.department}"`,
    `"${s.location || 'ห้องยาและคลังยา รพ.สบปราบ'}"`,
    `"${s.lineUserId || ''}"`,
    `"${s.phone || ''}"`,
    `"${s.notes || ''}"`,
    `"${s.status || 'confirmed'}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

// 4. Download CSV file for Google Sheets
export function downloadShiftsCSV(shifts: DutyShift[], filename?: string): void {
  const csvContent = '\uFEFF' + exportShiftsToCSV(shifts); // Add BOM for Excel/Google Sheets Thai character support
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `ตารางเวร_GoogleSheets_DB_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 4.1 Generate iCalendar (.ics) for Google Calendar / Apple Calendar
export function generateICalendarFile(shifts: DutyShift[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DutySync//Sobprap Hospital Roster//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ตารางเวร รพ.สบปราบ',
    'X-WR-TIMEZONE:Asia/Bangkok',
  ];

  shifts.forEach(s => {
    const cleanDate = s.date.replace(/-/g, '');
    const cleanStart = s.startTime.replace(':', '') + '00';
    const cleanEnd = s.endTime.replace(':', '') + '00';

    lines.push(
      'BEGIN:VEVENT',
      `UID:shift-${s.id}-${cleanDate}@dutysync.local`,
      `DTSTAMP:${cleanDate}T${cleanStart}Z`,
      `DTSTART;TZID=Asia/Bangkok:${cleanDate}T${cleanStart}`,
      `DTEND;TZID=Asia/Bangkok:${cleanDate}T${cleanEnd}`,
      `SUMMARY:เวร${s.shiftName} - ${s.staffName}`,
      `DESCRIPTION:เจ้าหน้าที่: ${s.staffName}\\nกะเวร: ${s.shiftName} (${s.startTime} - ${s.endTime} น.)\\nแผนก: ${s.department}\\nหมายเหตุ: ${s.notes || 'งานเอกสารและจ่ายยา OT'}`,
      `LOCATION:${s.location || 'ห้องยาและคลังยา รพ.สบปราบ'}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICalendarFile(shifts: DutyShift[], filename?: string): void {
  const icsContent = generateICalendarFile(shifts);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `ตารางเวร_GoogleCalendar_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 5. Google Apps Script Web App sync (Optional 2-way live sync)
export async function syncShiftsToAppsScript(appsScriptUrl: string, shifts: DutyShift[]): Promise<boolean> {
  if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
    throw new Error('กรุณาระบุ URL ของ Google Apps Script Web App');
  }

  const payload = {
    action: 'saveShifts',
    timestamp: new Date().toISOString(),
    count: shifts.length,
    shifts,
  };

  const res = await fetch(appsScriptUrl, {
    method: 'POST',
    mode: 'no-cors', // Apps Script standard webhook support
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  saveDbConfig({
    lastSyncTime: new Date().toISOString(),
    appsScriptUrl,
    dbStatus: 'connected',
  });
  return true;
}

// 6. Notification Logs Storage
export function saveNotificationLog(
  log: Omit<NotificationLog, 'id' | 'timestamp'>
): NotificationLog {
  const currentLogs = loadNotificationLogs();
  const newLog: NotificationLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newLog, ...currentLogs].slice(0, 50); // Keep latest 50 logs
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save log to local storage:', e);
  }
  return newLog;
}

export function loadNotificationLogs(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load logs:', e);
  }
  return [];
}

export function clearNotificationLogs(): void {
  localStorage.removeItem(STORAGE_KEY_LOGS);
}

// 7. User Settings
export function saveUserSettings(settings: {
  lineChannelToken?: string;
  defaultSpreadsheetUrl?: string;
  appsScriptUrl?: string;
  autoSync?: boolean;
}): void {
  try {
    const current = loadUserSettings();
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ ...current, ...settings }));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}

export function loadUserSettings(): {
  lineChannelToken?: string;
  defaultSpreadsheetUrl?: string;
  appsScriptUrl?: string;
  autoSync?: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return {};
}

// 8. Ready-to-use Google Apps Script Code
export function getAppsScriptTemplateCode(): string {
  return `/**
 * Google Apps Script - DutySync Database Web App
 * 1. เปิด Google Sheets ตารางเวรของคุณ
 * 2. ไปที่ Extensions (ส่วนขยาย) > Apps Script
 * 3. วางโค้ดนี้ทั้งหมดลงใน Code.gs
 * 4. คลิก Deploy (การทำให้ใช้งานได้) > New deployment (การทำให้ใช้งานได้ใหม่)
 * 5. เลือก Type: Web app
 *    - Execute as: Me (ฉัน)
 *    - Who has access: Anyone (ทุกคน)
 * 6. คัดลอก Web App URL นำมาใส่ในแอป DutySync เพื่อบันทึกข้อมูลสด 2 ทาง!
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    rows: data.length,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DutySync_DB") || 
                SpreadsheetApp.getActiveSpreadsheet().insertSheet("DutySync_DB");
    
    if (contents.action === "saveShifts" && contents.shifts) {
      sheet.clearContents();
      sheet.appendRow(["ID", "Date", "StaffName", "ShiftType", "ShiftName", "StartTime", "EndTime", "Department", "LINE_ID", "Status"]);
      
      contents.shifts.forEach(function(s) {
        sheet.appendRow([s.id, s.date, s.staffName, s.shiftType, s.shiftName, s.startTime, s.endTime, s.department, s.lineUserId || "", s.status || "confirmed"]);
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "บันทึกข้อมูลตารางเวร " + contents.shifts.length + " กะ สำเร็จแล้ว",
        updatedAt: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}
