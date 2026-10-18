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

export interface FlexCardConfig {
  hospitalName: string; // e.g. "รพ.สบปราบ • เภสัชกรรม"
  badgeText: string; // e.g. "GROUP BROADCAST"
  headerBgColor: string; // e.g. "#18181B"
  headerTextColor: string; // e.g. "#10B981"
  defaultTitle: string; // e.g. "📢 แจ้งเตือนการปฏิบัติงานอยู่เวร"
  dateLabel: string; // e.g. "📅 ประจำวันที่:"
  staffSectionTitle: string; // e.g. "👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงานอยู่เวร:"
  morningShiftLabel: string; // e.g. "🌅 กะเช้า OT (08:30 - 16:30 น.)"
  afternoonShiftLabel: string; // e.g. "🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)"
  noShiftNotice: string; // e.g. "ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้"
  timingPrefix: string; // e.g. "รายละเอียด:"
  showAdviceBox: boolean;
  adviceText: string; // e.g. "💡 ข้อแนะนำ: หากติดภารกิจต้องการแลกเวร กรุณาแจ้งหัวหน้าเวรล่วงหน้าอย่างน้อย 24 ชั่วโมง"
  
  // Footer buttons
  button1Label: string; // max 20 chars
  button1Text: string;
  button1Color: string; // e.g. "#06C755"
  showButton2: boolean;
  button2Label: string; // max 20 chars
  button2Text: string;

  // 3-Slot descriptions
  weekday1555Title: string;
  weekday1555Desc: string;
  weekday2000Title: string;
  weekday2000Desc: string;
  weekend0755Title: string;
  weekend0755Desc: string;
}

export const DEFAULT_FLEX_CARD_CONFIG: FlexCardConfig = {
  hospitalName: 'รพ.สบปราบ • เภสัชกรรม',
  badgeText: 'GROUP BROADCAST',
  headerBgColor: '#18181B',
  headerTextColor: '#10B981',
  defaultTitle: '📢 แจ้งเตือนการปฏิบัติงานอยู่เวร',
  dateLabel: '📅 ประจำวันที่:',
  staffSectionTitle: '👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน:',
  morningShiftLabel: '🌅 กะเช้า OT (08:30 - 16:30 น.)',
  afternoonShiftLabel: '🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)',
  noShiftNotice: 'ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้',
  timingPrefix: 'รายละเอียด:',
  showAdviceBox: true,
  adviceText: '💡 ข้อแนะนำ: หากติดภารกิจต้องการแลกเวร กรุณาแจ้งหัวหน้าเวรล่วงหน้าอย่างน้อย 24 ชั่วโมง',
  
  button1Label: 'รับทราบตารางเวร',
  button1Text: 'รับทราบตารางเวรประจำวันเรียบร้อยครับ/ค่ะ',
  button1Color: '#06C755',
  showButton2: true,
  button2Label: 'ขอแลกเวร',
  button2Text: 'ขอแจ้งแลกเวร ติดภารกิจด่วน',

  weekday1555Title: '📢 แจ้งเตือนกะบ่าย (เวลา 15:55 น.) • วันจันทร์ - ศุกร์',
  weekday1555Desc: 'อีก 5 นาทีจะเริ่มเวลาปฏิบัติงานกะบ่าย (16:00 - 20:00 น.) ขอให้เจ้าหน้าที่เข้าปฏิบัติงานและตรวจเช็คเอกสารยา',
  weekday2000Title: '📋 แจ้งเตือนปิดกะบ่าย & ส่งมอบเวร (เวลา 20:00 น.) • วันจันทร์ - ศุกร์',
  weekday2000Desc: 'สิ้นสุดเวลาปฏิบัติงานกะบ่าย 20:00 น. ขอให้สรุปยอดเอกสาร ปิดระบบ และลงบันทึกรายงานให้เรียบร้อย',
  weekend0755Title: '🌅 แจ้งเตือนเวรเช้าวันหยุด (เวลา 07:55 น.) • เสาร์ - อาทิตย์ / นักขัตฤกษ์',
  weekend0755Desc: 'เวรวันหยุด เช้า OT (08:30 - 16:30 น.) บริหารจัดการคลังยา เอกสาร และเวชภัณฑ์',
};

