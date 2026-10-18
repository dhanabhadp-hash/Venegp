export type ShiftType = 'morning' | 'afternoon';

export interface DutyShift {
  id: string;
  date: string; // YYYY-MM-DD
  staffName: string;
  shiftType: ShiftType;
  shiftName: string; // "เช้า OT (เอกสาร)" or "บ่าย 4 ชม. OT (เอกสาร)"
  startTime: string; // "08:30" or "16:00"
  endTime: string; // "16:30" or "20:00"
  department: string; // "กลุ่มงานเภสัชกรรม รพ.สบปราบ"
  lineUserId?: string; // LINE User ID
  phone?: string;
  notes?: string;
  location?: string;
  status?: 'confirmed' | 'pending' | 'swapped';
  syncedToCalendar?: boolean;
  syncedToTasks?: boolean;
  notifiedCount?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  department: string;
  lineUserId: string;
  phone: string;
  role: string;
  avatarColor?: string;
}

export type ScheduleDayCategory = 'weekday' | 'weekend_holiday';

export interface NotificationRule {
  id: string;
  name: string;
  dayCategory: ScheduleDayCategory;
  triggerTime: string; // e.g. "15:55", "20:00", "07:55"
  description: string;
  enabled: boolean;
  useFlexMessage: boolean;
  customTemplate?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  staffName: string;
  lineUserId: string;
  shiftDate: string;
  shiftName: string;
  triggerTimeText: string;
  status: 'success' | 'failed';
  messageType: 'flex' | 'text';
  error?: string;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface GoogleTaskListItem {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
}

export interface GoogleDriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}
