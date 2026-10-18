import { getAccessToken } from './googleAuth';
import {
  GoogleCalendarItem,
  GoogleTaskListItem,
  GoogleTaskItem,
  GoogleDriveSpreadsheetItem,
  DutyShift,
} from '../types/roster';

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // If it's a full Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

// ==========================================
// 1. Google Drive & Sheets APIs
// ==========================================

export async function listUserSpreadsheetsFromDrive(): Promise<GoogleDriveSpreadsheetItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=20&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถค้นหา Google Sheets จาก Google Drive ได้');
  }

  const data = await res.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
  }));
}

export async function getSpreadsheetDetails(spreadsheetId: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `ไม่สามารถเปิด Google Sheet ได้ (รหัสสถานะ: ${res.status})`);
  }

  const data = await res.json();
  return {
    title: data.properties?.title || 'Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount,
      columnCount: s.properties.gridProperties?.columnCount,
    })),
  };
}

export async function fetchSheetValues(spreadsheetId: string, range: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `ไม่สามารถดึงข้อมูลตารางได้ (รหัสสถานะ: ${res.status})`);
  }

  const data = await res.json();
  return data.values as string[][] | undefined;
}

export async function createRosterSpreadsheet(
  title: string,
  shifts: DutyShift[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  // Format shifts into rows
  const headers = ['ลำดับ', 'วันที่', 'ชื่อ-นามสกุล', 'กะเวร', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'แผนก', 'สถานที่', 'สถานะ'];
  const rows = shifts.map((shift, idx) => [
    String(idx + 1),
    shift.date,
    shift.staffName,
    shift.shiftName,
    shift.startTime,
    shift.endTime,
    shift.department,
    shift.location || '-',
    shift.status || 'confirmed',
  ]);

  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'ตารางเวรปฏิบัติงาน',
          gridProperties: {
            rowCount: rows.length + 10,
            columnCount: headers.length + 2,
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headers.map(h => ({
                  userEnteredValue: { stringValue: h },
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
                  },
                })),
              },
              ...rows.map(row => ({
                values: row.map(cell => ({
                  userEnteredValue: { stringValue: cell },
                })),
              })),
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถสร้าง Google Sheet ใหม่ได้');
  }

  const result = await res.json();
  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl,
  };
}

// ==========================================
// 2. Google Calendar API
// ==========================================

export async function listUserCalendars(): Promise<GoogleCalendarItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถดึงรายชื่อ Google Calendar ได้');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary,
    primary: !!item.primary,
    backgroundColor: item.backgroundColor,
  }));
}

export async function createCalendarDutyEvent(
  calendarId: string,
  shift: DutyShift,
  options?: { colorId?: string; reminderMinutes?: number }
) {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  let startDateTime: string | undefined;
  let endDateTime: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;

  const dateStr = shift.date;

  if (shift.startTime && shift.endTime && shift.startTime !== '00:00') {
    startDateTime = `${dateStr}T${shift.startTime}:00+07:00`;
    let endDateStr = dateStr;
    if (shift.endTime < shift.startTime) {
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      endDateStr = nextDay.toISOString().split('T')[0];
    }
    endDateTime = `${endDateStr}T${shift.endTime}:00+07:00`;
  } else {
    startDate = dateStr;
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    endDate = nextDay.toISOString().split('T')[0];
  }

  const eventPayload: any = {
    summary: `[เวร] ${shift.staffName} - ${shift.shiftName}`,
    description: `📋 ข้อมูลการอยู่เวร:\n• เจ้าหน้าที่: ${shift.staffName}\n• แผนก: ${shift.department}\n• ช่วงเวลา: ${shift.startTime} - ${shift.endTime}\n• สถานที่: ${shift.location || 'สถานที่ปฏิบัติงาน'}\n• หมายเหตุ: ${shift.notes || '-'}\n• เบอร์โทรศัพท์: ${shift.phone || '-'}\n\nบันทึกอัตโนมัติโดย DutySync & LINE OA Notifier`,
    location: shift.location || shift.department,
    start: startDateTime ? { dateTime: startDateTime, timeZone: 'Asia/Bangkok' } : { date: startDate },
    end: endDateTime ? { dateTime: endDateTime, timeZone: 'Asia/Bangkok' } : { date: endDate },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: options?.reminderMinutes ?? 1440 },
        { method: 'popup', minutes: 120 },
      ],
    },
  };

  if (options?.colorId) {
    eventPayload.colorId = options.colorId;
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถสร้างกิจกรรมบน Google Calendar ได้');
  }

  return await res.json();
}

// ==========================================
// 3. Google Tasks API
// ==========================================

export async function listUserTaskLists(): Promise<GoogleTaskListItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถดึงรายการ Google Tasks ได้');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    updated: item.updated,
  }));
}

export async function createTaskList(title: string): Promise<GoogleTaskListItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถสร้าง Task List ใหม่ได้');
  }

  return await res.json();
}

export async function listTasksInList(taskListId: string): Promise<GoogleTaskItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถดึงภารกิจจาก Google Tasks ได้');
  }

  const data = await res.json();
  return (data.items || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status,
    due: t.due,
    completed: t.completed,
    updated: t.updated,
  }));
}

export async function createGoogleTask(taskListId: string, shift: DutyShift) {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const dueDate = new Date(`${shift.date}T00:00:00Z`).toISOString();

  const taskPayload = {
    title: `[อยู่เวร] ${shift.staffName} (${shift.shiftName})`,
    notes: `วันที่: ${shift.date}\nแผนก: ${shift.department}\nเวลา: ${shift.startTime} - ${shift.endTime}\nเบอร์ติดต่อ: ${shift.phone || '-'}\nหมายเหตุ: ${shift.notes || '-'}\nสถานะ: ประสานงานเวรสำเร็จ`,
    due: dueDate,
    status: 'needsAction',
  };

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskPayload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถเพิ่มงานใน Google Tasks ได้');
  }

  return await res.json();
}

export async function toggleTaskComplete(
  taskListId: string,
  taskId: string,
  isCompleted: boolean
): Promise<GoogleTaskItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const newStatus = isCompleted ? 'completed' : 'needsAction';
  const payload: any = {
    id: taskId,
    status: newStatus,
  };
  if (isCompleted) {
    payload.completed = new Date().toISOString();
  }

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถเปลี่ยนสถานะ Google Task ได้');
  }

  return await res.json();
}

export async function deleteGoogleTask(taskListId: string, taskId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ Google Workspace ก่อน');

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'ไม่สามารถลบรายการ Google Task ได้');
  }
}
