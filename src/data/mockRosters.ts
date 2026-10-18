import { DutyShift, StaffMember, NotificationRule } from '../types/roster';

export const HOSPITAL_INFO = {
  name: 'โรงพยาบาลสบปราบ',
  department: 'กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค',
  title: 'ตารางการปฏิบัติงาน ประจำเดือน ตุลาคม พ.ศ. 2569',
  period: 'วันที่ 1 ตุลาคม พ.ศ. 2569 ถึง 31 ตุลาคม พ.ศ. 2569',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1DzH6jwgFhDiRSylIv6RYODugMpXrp_n_A0q4jfp_jZg/edit?usp=drivesdk',
  coordinator: 'นางรุ่งนภา ถึงทุ่ง (เจ้าพนักงานเภสัชกรรมชำนาญงาน - ผู้จัดเวร)',
  reviewer: 'นางจิรพร เมธีโชติเศรษฐ์ (เภสัชกรชำนาญการ - ผู้ตรวจสอบ)',
  approver: 'นายสิทธิกร สาริวาท (ผู้อำนวยการเชี่ยวชาญ โรงพยาบาลสบปราบ - ผู้อนุมัติ)',
  shiftsDefinition: {
    morning: {
      name: 'เช้า OT (เอกสาร)',
      hours: '08:30 - 16:30',
      startTime: '08:30',
      endTime: '16:30',
    },
    afternoon: {
      name: 'บ่าย 4 ชม. OT (เอกสาร)',
      hours: '16:00 - 20:00',
      startTime: '16:00',
      endTime: '20:00',
    },
  },
};

// Thai Public Holidays for October 2026
export const THAI_HOLIDAYS_OCT_2026: { [dateStr: string]: string } = {
  '2026-10-13': 'วันนวมินทรมหาราช (วันคล้ายวันสวรรคต ร.9)',
  '2026-10-23': 'วันปิยมหาราช',
};

export function isWeekendOrHoliday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  return Boolean(THAI_HOLIDAYS_OCT_2026[dateStr]);
}

export const SOBPRAP_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'น.ส.กนกวรรณ ศรีจันทร์',
    department: 'กลุ่มงานเภสัชกรรม',
    role: 'เจ้าพนักงานเภสัชกรรมปฏิบัติงาน',
    lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    phone: '081-456-7890',
  },
  {
    id: 'staff-2',
    name: 'นางปริยากร หล้าภู',
    department: 'กลุ่มงานเภสัชกรรม',
    role: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน',
    lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
    phone: '089-123-4567',
  },
  {
    id: 'staff-3',
    name: 'นางรุ่งนภา ถึงทุ่ง',
    department: 'กลุ่มงานเภสัชกรรม',
    role: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน (ผู้จัดเวร)',
    lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
    phone: '086-789-0123',
  },
  {
    id: 'staff-4',
    name: 'นายธนาพัทธ์ ปงกา',
    department: 'กลุ่มงานเภสัชกรรม',
    role: 'พนักงานเภสัชกรรม',
    lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
    phone: '084-567-8901',
  },
];

// 20 Exact Shifts from Hospital Sheet (October 1 to October 31, 2026)
// Only 2 shifts: เช้า OT (08:30 - 16:30) and บ่าย 4 ชม. OT (16:00 - 20:00)
export function getSobprapHospitalRoster(): DutyShift[] {
  return [
    // 1 ต.ค. 2569 (พฤ - จันทร์-ศุกร์)
    {
      id: 'sobprap-1',
      date: '2026-10-01',
      staffName: 'นางปริยากร หล้าภู',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
      phone: '089-123-4567',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    {
      id: 'sobprap-2',
      date: '2026-10-01',
      staffName: 'นายธนาพัทธ์ ปงกา',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      phone: '084-567-8901',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'พนักงานเภสัชกรรม • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 2 ต.ค. 2569 (ศ - จันทร์-ศุกร์)
    {
      id: 'sobprap-3',
      date: '2026-10-02',
      staffName: 'นายธนาพัทธ์ ปงกา',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      phone: '084-567-8901',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'พนักงานเภสัชกรรม • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 4 ต.ค. 2569 (อา - วันเสาร์-อาทิตย์)
    {
      id: 'sobprap-4',
      date: '2026-10-04',
      staffName: 'น.ส.กนกวรรณ ศรีจันทร์',
      shiftType: 'morning',
      shiftName: 'เช้า OT (เอกสาร)',
      startTime: '08:30',
      endTime: '16:30',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      phone: '081-456-7890',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมปฏิบัติงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 6 ต.ค. 2569 (อ - จันทร์-ศุกร์)
    {
      id: 'sobprap-5',
      date: '2026-10-06',
      staffName: 'นางปริยากร หล้าภู',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
      phone: '089-123-4567',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    {
      id: 'sobprap-6',
      date: '2026-10-06',
      staffName: 'นายธนาพัทธ์ ปงกา',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      phone: '084-567-8901',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'พนักงานเภสัชกรรม • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 7 ต.ค. 2569 (พ - จันทร์-ศุกร์)
    {
      id: 'sobprap-7',
      date: '2026-10-07',
      staffName: 'นางปริยากร หล้าภู',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
      phone: '089-123-4567',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 8 ต.ค. 2569 (พฤ - จันทร์-ศุกร์)
    {
      id: 'sobprap-8',
      date: '2026-10-08',
      staffName: 'น.ส.กนกวรรณ ศรีจันทร์',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      phone: '081-456-7890',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมปฏิบัติงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    {
      id: 'sobprap-9',
      date: '2026-10-08',
      staffName: 'นางปริยากร หล้าภู',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
      phone: '089-123-4567',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 11 ต.ค. 2569 (อา - วันเสาร์-อาทิตย์)
    {
      id: 'sobprap-10',
      date: '2026-10-11',
      staffName: 'นางรุ่งนภา ถึงทุ่ง',
      shiftType: 'morning',
      shiftName: 'เช้า OT (เอกสาร)',
      startTime: '08:30',
      endTime: '16:30',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
      phone: '086-789-0123',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 12 ต.ค. 2569 (จ - จันทร์-ศุกร์)
    {
      id: 'sobprap-11',
      date: '2026-10-12',
      staffName: 'นายธนาพัทธ์ ปงกา',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      phone: '084-567-8901',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'พนักงานเภสัชกรรม • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 14 ต.ค. 2569 (พ - จันทร์-ศุกร์)
    {
      id: 'sobprap-12',
      date: '2026-10-14',
      staffName: 'น.ส.กนกวรรณ ศรีจันทร์',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      phone: '081-456-7890',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมปฏิบัติงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    {
      id: 'sobprap-13',
      date: '2026-10-14',
      staffName: 'นางปริยากร หล้าภู',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
      phone: '089-123-4567',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 16 ต.ค. 2569 (ศ - จันทร์-ศุกร์)
    {
      id: 'sobprap-14',
      date: '2026-10-16',
      staffName: 'นางปริยากร หล้าภู',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
      phone: '089-123-4567',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    {
      id: 'sobprap-15',
      date: '2026-10-16',
      staffName: 'นายธนาพัทธ์ ปงกา',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      phone: '084-567-8901',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'พนักงานเภสัชกรรม • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 17 ต.ค. 2569 (ส - วันเสาร์-อาทิตย์)
    {
      id: 'sobprap-16',
      date: '2026-10-17',
      staffName: 'นางรุ่งนภา ถึงทุ่ง',
      shiftType: 'morning',
      shiftName: 'เช้า OT (เอกสาร)',
      startTime: '08:30',
      endTime: '16:30',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
      phone: '086-789-0123',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 19 ต.ค. 2569 (จ - จันทร์-ศุกร์)
    {
      id: 'sobprap-17',
      date: '2026-10-19',
      staffName: 'นายธนาพัทธ์ ปงกา',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
      phone: '084-567-8901',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'พนักงานเภสัชกรรม • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 20 ต.ค. 2569 (อ - จันทร์-ศุกร์)
    {
      id: 'sobprap-18',
      date: '2026-10-20',
      staffName: 'นางรุ่งนภา ถึงทุ่ง',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
      phone: '086-789-0123',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 23 ต.ค. 2569 (ศ - วันปิยมหาราช วันหยุดนักขัตฤกษ์)
    {
      id: 'sobprap-19',
      date: '2026-10-23',
      staffName: 'น.ส.กนกวรรณ ศรีจันทร์',
      shiftType: 'morning',
      shiftName: 'เช้า OT (เอกสาร)',
      startTime: '08:30',
      endTime: '16:30',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      phone: '081-456-7890',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมปฏิบัติงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
    // 27 ต.ค. 2569 (อ - จันทร์-ศุกร์)
    {
      id: 'sobprap-20',
      date: '2026-10-27',
      staffName: 'นางรุ่งนภา ถึงทุ่ง',
      shiftType: 'afternoon',
      shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
      startTime: '16:00',
      endTime: '20:00',
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
      phone: '086-789-0123',
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'เจ้าพนักงานเภสัชกรรมชำนาญงาน • งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    },
  ];
}

export function getSampleRosterData(): DutyShift[] {
  return getSobprapHospitalRoster();
}

// 3 Strict Notification Rules per user requirement
export const STRICT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'rule-weekday-1',
    name: 'วันจันทร์ - ศุกร์ ครั้งที่ 1 (15:55 น.)',
    dayCategory: 'weekday',
    triggerTime: '15:55',
    description: 'แจ้งเตือนก่อนเริ่มกะบ่าย 5 นาที (บ่าย 4 ชม. OT 16:00 - 20:00)',
    enabled: true,
    useFlexMessage: true,
  },
  {
    id: 'rule-weekday-2',
    name: 'วันจันทร์ - ศุกร์ ครั้งที่ 2 (20:00 น.)',
    dayCategory: 'weekday',
    triggerTime: '20:00',
    description: 'แจ้งเตือนปิดกะบ่าย สรุปงานเอกสารและการส่งมอบเวร',
    enabled: true,
    useFlexMessage: true,
  },
  {
    id: 'rule-weekend-1',
    name: 'วันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ (07:55 น.)',
    dayCategory: 'weekend_holiday',
    triggerTime: '07:55',
    description: 'ส่งแจ้งเตือน 1 ครั้ง เวลา 07:55 น. ก่อนเริ่มเวรเช้า OT (08:30 - 16:30)',
    enabled: true,
    useFlexMessage: true,
  },
];

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * =======================================================================
 * ระบบแจ้งเตือนวันอยู่เวรอัตโนมัติเข้ากลุ่มไลน์ (LINE OA 1 กลุ่ม)
 * โรงพยาบาลสบปราบ (กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค)
 * ตารางการปฏิบัติงาน ประจำเดือน ตุลาคม พ.ศ. 2569
 * =======================================================================
 * 
 * เงื่อนไขเวลาการส่งแจ้งเตือนเข้ากลุ่มไลน์:
 * 1. วันจันทร์ - ศุกร์ ส่ง 2 เวลา:
 *    • ครั้งที่ 1 เวลา 15:55 น. -> แจ้งเตือนก่อนเริ่มกะบ่าย OT 5 นาที พร้อมสรุปรายชื่อคนขึ้นเวร
 *    • ครั้งที่ 2 เวลา 20:00 น. -> แจ้งเตือนปิดกะบ่าย สรุปงานเอกสารยาและส่งมอบเวร
 * 2. วันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ ส่ง 1 เวลา:
 *    • เวลา 07:55 น. -> แจ้งเตือนก่อนเริ่มกะเช้า OT (08:30 - 16:30 น.)
 */

// 1. กำหนด Token และ รหัสกลุ่มไลน์
const LINE_CHANNEL_ACCESS_TOKEN = "YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE";
const LINE_GROUP_ID = "YOUR_LINE_GROUP_ID_HERE"; // เช่น C0123456789abcdef0123456789abcde

// วันหยุดนักขัตฤกษ์ประจำเดือน ต.ค. 2569
const PUBLIC_HOLIDAYS_OCT_2026 = ["2026-10-13", "2026-10-23"];

/**
 * ฟังก์ชันสร้าง Trigger อัตโนมัติ (กดรันฟังก์ชันนี้ครั้งเดียวเพื่อตั้งเวลาอัตโนมัติ)
 */
function setupAutoTriggers() {
  // ลบ Trigger เดิมออกก่อน
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // 1. วันจันทร์-ศุกร์ เวลา 15:55 น.
  ScriptApp.newTrigger("triggerWeekdayAfternoonStart")
    .timeBased()
    .everyDays(1)
    .atHour(15)
    .nearMinute(55)
    .create();

  // 2. วันจันทร์-ศุกร์ เวลา 20:00 น.
  ScriptApp.newTrigger("triggerWeekdayAfternoonEnd")
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .nearMinute(0)
    .create();

  // 3. เสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 07:55 น.
  ScriptApp.newTrigger("triggerWeekendMorning")
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .nearMinute(55)
    .create();

  Logger.log("✅ ตั้งค่า Trigger อัตโนมัติ 3 เวลาเรียบร้อยแล้ว!");
}

function triggerWeekdayAfternoonStart() {
  const now = new Date();
  const day = now.getDay();
  const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
  if (day >= 1 && day <= 5 && PUBLIC_HOLIDAYS_OCT_2026.indexOf(dateStr) === -1) {
    sendGroupRosterNotification("weekday_1555");
  }
}

function triggerWeekdayAfternoonEnd() {
  const now = new Date();
  const day = now.getDay();
  const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
  if (day >= 1 && day <= 5 && PUBLIC_HOLIDAYS_OCT_2026.indexOf(dateStr) === -1) {
    sendGroupRosterNotification("weekday_2000");
  }
}

function triggerWeekendMorning() {
  const now = new Date();
  const day = now.getDay();
  const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
  if (day === 0 || day === 6 || PUBLIC_HOLIDAYS_OCT_2026.indexOf(dateStr) !== -1) {
    sendGroupRosterNotification("weekend_0755");
  }
}

/**
 * ตรวจสอบรายชื่อคนอยู่เวรวันนี้จากชีท แล้วส่งเข้ากลุ่มไลน์ 1 กลุ่ม
 * @param {string} slotType - 'weekday_1555', 'weekday_2000' หรือ 'weekend_0755'
 * @param {number} [overrideDay] - ระบุวันที่ (1-31) สำหรับการทดสอบ เช่น 16
 */
function sendGroupRosterNotification(slotType, overrideDay) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const today = new Date();
  const todayDay = (typeof overrideDay === 'number' && overrideDay >= 1 && overrideDay <= 31) ? overrideDay : today.getDate();
  const todayDateStr = overrideDay ? ("2026-10-" + (overrideDay < 10 ? "0" + overrideDay : overrideDay)) : Utilities.formatDate(today, "GMT+7", "yyyy-MM-dd");

  const onDutyStaff = [];

  // ค้นหาคอลัมน์ของวันที่ todayDay ในหัวตาราง
  let colIndex = 2 + todayDay;
  for (let r = 0; r < Math.min(5, data.length); r++) {
    for (let c = 0; c < data[r].length; c++) {
      const match = String(data[r][c]).match(/^(\d{1,2})/);
      if (match && parseInt(match[1], 10) === todayDay) {
        colIndex = c;
        break;
      }
    }
  }

  // อ่านข้อมูลเจ้าหน้าที่ทุกแถว (ข้ามแถวหัวตารางและแถวรวม)
  for (let r = 4; r < data.length; r++) {
    const staffName = String(data[r][1] || '').trim();
    const position = String(data[r][2] || '').trim();
    if (!staffName || staffName.indexOf('รวม') !== -1 || staffName.indexOf('ผู้จัดเวร') !== -1) continue;

    if (colIndex < data[r].length) {
      const shiftValue = String(data[r][colIndex] || '').trim();
      if (shiftValue && shiftValue !== "" && shiftValue !== "-" && shiftValue !== "0") {
        onDutyStaff.push({
          name: staffName,
          position: position,
          shiftText: shiftValue
        });
      }
    }
  }

  // หากไม่มีคนอยู่เวรในวันนี้
  if (onDutyStaff.length === 0) {
    Logger.log("ไม่มีรายชื่อผู้ปฏิบัติงานอยู่เวรในวันที่ (" + todayDateStr + ")");
    return;
  }

  let slotTitle = "";
  let timingDetail = "";

  if (slotType === "weekday_1555") {
    slotTitle = "📢 แจ้งเตือนกะบ่าย (เวลา 15:55 น.)";
    timingDetail = "อีก 5 นาทีจะเริ่มเวลาปฏิบัติงานกะบ่าย (16:00 - 20:00 น.) ขอให้เจ้าหน้าที่เข้าปฏิบัติงานและตรวจเช็คเอกสารยา";
  } else if (slotType === "weekday_2000") {
    slotTitle = "📋 แจ้งเตือนปิดกะบ่าย & ส่งมอบเวร (เวลา 20:00 น.)";
    timingDetail = "สิ้นสุดเวลาปฏิบัติงานกะบ่าย 20:00 น. ขอให้สรุปยอดเอกสาร ปิดระบบ และลงบันทึกรายงานให้เรียบร้อย";
  } else {
    slotTitle = "🌅 แจ้งเตือนเวรเช้าวันหยุด (เวลา 07:55 น.)";
    timingDetail = "เวรวันหยุด เช้า OT (08:30 - 16:30 น.) บริหารจัดการคลังยา เอกสาร และเวชภัณฑ์";
  }

  let staffListText = "";
  onDutyStaff.forEach(function(s, idx) {
    staffListText += "\\n" + (idx + 1) + ". " + s.name + " (" + s.position + ") - " + s.shiftText;
  });

  const messageText = "[" + slotTitle + "]\\n" +
                      "🏥 โรงพยาบาลสบปราบ • กลุ่มงานเภสัชกรรม\\n" +
                      "📅 ประจำวันที่: " + todayDateStr + "\\n\\n" +
                      "👥 เจ้าหน้าที่ผู้ปฏิบัติงานอยู่เวร:" + staffListText + "\\n\\n" +
                      "📌 รายละเอียด: " + timingDetail + "\\n\\n" +
                      "กรุณาสมาชิกในกลุ่มตอบรับทราบเวร ขอบคุณครับ/ค่ะ";

  // ส่งเข้ากลุ่มไลน์ผ่าน Push Message API
  const targetTo = (LINE_GROUP_ID && LINE_GROUP_ID !== "YOUR_LINE_GROUP_ID_HERE") 
                   ? LINE_GROUP_ID.trim() 
                   : "";

  if (!targetTo) {
    Logger.log("⚠️ ยังไม่ได้ระบุ LINE_GROUP_ID กรุณาระบุรหัสกลุ่มไลน์");
    return;
  }

  const payload = {
    to: targetTo,
    messages: [
      {
        type: "text",
        text: messageText
      }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
  Logger.log("ผลการส่งเข้ากลุ่มไลน์ (" + targetTo + "): " + response.getResponseCode() + " " + response.getContentText());
}

/**
 * ฟังก์ชันสำหรับทดสอบส่งข้อมูลเวรวันที่ 16/10/69 เข้ากลุ่มไลน์ทันที (กดเลือกฟังก์ชันนี้แล้วกด Run ใน Apps Script)
 */
function testSendFor16Oct() {
  Logger.log("กำลังทดสอบส่งแจ้งเตือนรอบ 15:55 น. สำหรับวันที่ 16 ตุลาคม 2569...");
  sendGroupRosterNotification("weekday_1555", 16);
}
`;

