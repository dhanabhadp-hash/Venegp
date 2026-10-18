import { DutyShift } from '../types/roster';

export interface LineBotInfo {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode?: string;
  markAsReadMode?: string;
}

export async function getLineServerConfig(): Promise<{
  hasServerSecret: boolean;
  envGroupId: string;
  envUserId: string;
}> {
  try {
    const res = await fetch('/api/line/config');
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Could not query line server config:', e);
  }
  return { hasServerSecret: false, envGroupId: '', envUserId: '' };
}

export async function testLineChannelToken(channelAccessToken?: string): Promise<LineBotInfo> {
  const cleanToken = channelAccessToken?.trim() || '';

  let res: Response;
  try {
    res = await fetch('/api/line/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelAccessToken: cleanToken }),
    });
  } catch (err: any) {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ proxy เพื่อทดสอบ LINE Token ได้ กรุณาลองใหม่อีกครั้ง');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('Channel Access Token ไม่ถูกต้อง หรือหมดอายุแล้ว (HTTP 401 Unauthorized) กรุณาคัดลอก Token จาก LINE Developers');
    }
    throw new Error(err.error || err.message || `โทเค็น LINE ไม่ถูกต้อง หรือยังไม่ได้เปิด Messaging API (รหัสสถานะ: ${res.status})`);
  }

  return await res.json();
}

export function buildDutyFlexMessage(shift: DutyShift, advanceNoticeText?: string) {
  const noticeTitle = advanceNoticeText || 'แจ้งเตือนการปฏิบัติงานอยู่เวร';
  
  // Shift badge color (Swiss high-contrast: Morning Emerald, Afternoon Amber)
  const badgeColor = shift.shiftType === 'morning' ? '#059669' : '#D97706';

  return {
    type: 'flex',
    altText: `[แจ้งเตือนอยู่เวร] ${shift.staffName} - ${shift.shiftName} (${shift.date})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#18181B',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: 'รพ.สบปราบ • เภสัชกรรม',
                weight: 'bold',
                size: 'xs',
                color: '#10B981',
              },
              {
                type: 'text',
                text: 'DUTY NOTIFIER',
                size: 'xxs',
                color: '#A1A1AA',
                align: 'end',
              },
            ],
          },
          {
            type: 'text',
            text: noticeTitle,
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ชื่อเจ้าหน้าที่:',
                size: 'sm',
                color: '#64748B',
                flex: 3,
              },
              {
                type: 'text',
                text: shift.staffName,
                weight: 'bold',
                size: 'md',
                color: '#0F172A',
                flex: 5,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📅 วันที่ปฏิบัติงาน:',
                    size: 'sm',
                    color: '#475569',
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: shift.date,
                    weight: 'bold',
                    size: 'sm',
                    color: '#0284C7',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                alignItems: 'center',
                contents: [
                  {
                    type: 'text',
                    text: '⏰ กะ / ช่วงเวลา:',
                    size: 'sm',
                    color: '#475569',
                    flex: 4,
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    flex: 5,
                    contents: [
                      {
                        type: 'text',
                        text: `${shift.shiftName} (${shift.startTime}-${shift.endTime})`,
                        weight: 'bold',
                        size: 'sm',
                        color: badgeColor,
                        wrap: true,
                      },
                    ],
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🏢 แผนก / วอร์ด:',
                    size: 'sm',
                    color: '#475569',
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: shift.department || 'แผนกหลัก',
                    size: 'sm',
                    color: '#334155',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📍 สถานที่:',
                    size: 'sm',
                    color: '#475569',
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: shift.location || 'ประจำจุดปฏิบัติงาน',
                    size: 'sm',
                    color: '#334155',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📝 หมายเหตุ:',
                    size: 'sm',
                    color: '#475569',
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: shift.notes || 'กรุณาตรงต่อเวลา เตรียมพร้อมอุปกรณ์',
                    size: 'sm',
                    color: '#64748B',
                    flex: 5,
                    wrap: true,
                  },
                ],
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            backgroundColor: '#F8FAFC',
            cornerRadius: 'md',
            paddingAll: '10px',
            contents: [
              {
                type: 'text',
                text: '💡 ข้อแนะนำ: หากติดภารกิจต้องการแลกเวร กรุณาแจ้งหัวหน้าเวรล่วงหน้าอย่างน้อย 24 ชั่วโมง',
                size: 'xs',
                color: '#64748B',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#FFFFFF',
        paddingAll: '14px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'message',
              label: 'รับทราบเวร',
              text: `รับทราบการอยู่เวรวันที่ ${shift.date} (${shift.shiftName}) เรียบร้อยครับ/ค่ะ`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'message',
              label: 'ขอแลกเวร',
              text: `ขอแจ้งแลกเวร วันที่ ${shift.date} (${shift.shiftName}) ติดภารกิจ`,
            },
          },
        ],
      },
    },
  };
}

export function buildDutyTextMessage(shift: DutyShift, advanceNoticeText?: string, template?: string) {
  if (template) {
    return template
      .replace(/{staff_name}/g, shift.staffName)
      .replace(/{date}/g, shift.date)
      .replace(/{shift}/g, shift.shiftName)
      .replace(/{start_time}/g, shift.startTime)
      .replace(/{end_time}/g, shift.endTime)
      .replace(/{department}/g, shift.department)
      .replace(/{location}/g, shift.location || '-')
      .replace(/{notes}/g, shift.notes || '-');
  }

  const prefix = advanceNoticeText ? `[${advanceNoticeText}]\n` : '[แจ้งเตือนการปฏิบัติงานอยู่เวร]\n';
  return `${prefix}เจ้าหน้าที่: ${shift.staffName}
วันที่ปฏิบัติงาน: ${shift.date}
กะเวร: ${shift.shiftName} (${shift.startTime} - ${shift.endTime} น.)
หน่วยงาน: กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค โรงพยาบาลสบปราบ
สถานที่: ${shift.location || 'ห้องยาและคลังยา รพ.สบปราบ'}
หมายเหตุ: ${shift.notes || 'งานเอกสารและจ่ายยา OT'}

กรุณาตอบกลับข้อความนี้เพื่อยืนยันการรับทราบเวร ขอบคุณครับ/ค่ะ`;
}

export async function sendLinePushMessage(
  channelAccessToken: string,
  toUserId: string,
  messages: any[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanToken = channelAccessToken.trim();
  const cleanTo = toUserId.trim();

  let res: Response;
  try {
    res = await fetch('/api/line/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelAccessToken: cleanToken,
        to: cleanTo,
        messages: messages,
      }),
    });
  } catch (err: any) {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ proxy เพื่อส่ง LINE ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
  }

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } else {
    const errorData = await res.json().catch(() => ({}));
    const rawMsg = errorData.message || errorData.error || '';
    const details = Array.isArray(errorData.details)
      ? errorData.details.map((d: any) => `${d.property ? d.property + ': ' : ''}${d.message}`).join(', ')
      : '';
    const finalMsg = details ? `${rawMsg} (${details})` : rawMsg;

    if (res.status === 401) {
      throw new Error('LINE Auth Failed (401): Channel Access Token ไม่ถูกต้อง หรือหมดอายุ กรุณาตรวจสอบการตั้งค่าความลับ (Secrets)');
    } else if (res.status === 400) {
      if (cleanTo.startsWith('C') && rawMsg.includes('Failed to send messages')) {
        throw new Error(`LINE API แจ้งเตือน (HTTP 400): บอทยังไม่ได้เข้าร่วมกลุ่มไลน์ (${cleanTo}) กรุณากดเชิญ LINE Bot (@558uucbr เตือนแล้วนะ) เข้าร่วมกลุ่มไลน์ก่อน หรือทดสอบด้วยโหมด "ส่งรายคน" ด้วย User ID`);
      }
      throw new Error(`ข้อมูลไม่ถูกต้อง (HTTP 400): ${finalMsg || 'รหัสกลุ่มไลน์ (Group ID) หรือเนื้อหาข้อความไม่ถูกต้อง'}`);
    } else if (res.status === 404) {
      throw new Error(`ไม่พบเป้าหมาย (HTTP 404): ไม่พบ Group ID หรือ User ID (${cleanTo}) ในระบบ LINE`);
    } else {
      throw new Error(finalMsg || `LINE API ส่งไม่สำเร็จ (รหัสสถานะ: ${res.status})`);
    }
  }
}

export async function sendLineBroadcastMessage(
  channelAccessToken: string,
  messages: any[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanToken = channelAccessToken.trim();

  let res: Response;
  try {
    res = await fetch('/api/line/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelAccessToken: cleanToken,
        messages: messages,
      }),
    });
  } catch (err: any) {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ proxy เพื่อส่ง LINE Broadcast ได้');
  }

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } else {
    const errorData = await res.json().catch(() => ({}));
    const rawMsg = errorData.message || errorData.error || '';
    const details = Array.isArray(errorData.details)
      ? errorData.details.map((d: any) => `${d.property ? d.property + ': ' : ''}${d.message}`).join(', ')
      : '';
    const finalMsg = details ? `${rawMsg} (${details})` : rawMsg;

    if (res.status === 401) {
      throw new Error('LINE Auth Failed (401): Channel Access Token ไม่ถูกต้อง หรือหมดอายุ');
    } else {
      throw new Error(finalMsg || `LINE API Broadcast ไม่สำเร็จ (รหัสสถานะ: ${res.status})`);
    }
  }
}

export function buildGroupRosterFlexMessage(
  dayShifts: DutyShift[],
  dateStr: string,
  slotTitle: string,
  timingDetail: string
) {
  const morningShifts = dayShifts.filter(s => s.shiftType === 'morning');
  const afternoonShifts = dayShifts.filter(s => s.shiftType === 'afternoon');

  const staffItems: any[] = [];

  if (morningShifts.length > 0) {
    staffItems.push({
      type: 'box',
      layout: 'vertical',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '🌅 กะเช้า OT (08:30 - 16:30 น.)',
          size: 'xs',
          weight: 'bold',
          color: '#059669',
        },
        ...morningShifts.map(s => ({
          type: 'text',
          text: `• ${s.staffName}`,
          size: 'sm',
          color: '#18181B',
          margin: 'xs',
          weight: 'bold',
        })),
      ],
    });
  }

  if (afternoonShifts.length > 0) {
    staffItems.push({
      type: 'box',
      layout: 'vertical',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)',
          size: 'xs',
          weight: 'bold',
          color: '#D97706',
        },
        ...afternoonShifts.map(s => ({
          type: 'text',
          text: `• ${s.staffName}`,
          size: 'sm',
          color: '#18181B',
          margin: 'xs',
          weight: 'bold',
        })),
      ],
    });
  }

  if (staffItems.length === 0) {
    staffItems.push({
      type: 'text',
      text: 'ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้',
      size: 'sm',
      color: '#71717A',
    });
  }

  return {
    type: 'flex',
    altText: `[ประกาศกลุ่มเวร] รพ.สบปราบ ประจำวันที่ ${dateStr}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#18181B',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'รพ.สบปราบ • เภสัชกรรม',
                weight: 'bold',
                size: 'xs',
                color: '#10B981',
              },
              {
                type: 'text',
                text: 'GROUP BROADCAST',
                size: 'xxs',
                color: '#A1A1AA',
                align: 'end',
              },
            ],
          },
          {
            type: 'text',
            text: slotTitle,
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '📅 ประจำวันที่:',
                size: 'xs',
                color: '#71717A',
                flex: 3,
              },
              {
                type: 'text',
                text: dateStr,
                weight: 'bold',
                size: 'sm',
                color: '#18181B',
                flex: 5,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: staffItems,
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            backgroundColor: '#F4F4F5',
            cornerRadius: 'md',
            paddingAll: '10px',
            contents: [
              {
                type: 'text',
                text: `รายละเอียด: ${timingDetail}`,
                size: 'xs',
                color: '#52525B',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#FFFFFF',
        paddingAll: '14px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'message',
              label: 'รับทราบตารางเวร',
              text: `รับทราบตารางเวรประจำวันที่ ${dateStr} เรียบร้อยครับ/ค่ะ`,
            },
          },
        ],
      },
    },
  };
}

export function buildGroupRosterTextMessage(
  dayShifts: DutyShift[],
  dateStr: string,
  slotTitle: string,
  timingDetail: string
) {
  const morningShifts = dayShifts.filter(s => s.shiftType === 'morning');
  const afternoonShifts = dayShifts.filter(s => s.shiftType === 'afternoon');

  let staffListText = '';
  if (morningShifts.length > 0) {
    staffListText += `\n• กะเช้า OT (08:30 - 16:30 น.):\n  ` + morningShifts.map(s => s.staffName).join(', ');
  }
  if (afternoonShifts.length > 0) {
    staffListText += `\n• กะบ่าย 4 ชม. OT (16:00 - 20:00 น.):\n  ` + afternoonShifts.map(s => s.staffName).join(', ');
  }
  if (!staffListText) {
    staffListText = '\nไม่มีเวรในวันนี้';
  }

  return `[${slotTitle}]
โรงพยาบาลสบปราบ • กลุ่มงานเภสัชกรรม
วันที่: ${dateStr}

รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน:${staffListText}

หมายเหตุ: ${timingDetail}

กรุณาตอบกลับข้อความนี้เพื่อยืนยันการรับทราบเวรในกลุ่ม ขอบคุณครับ/ค่ะ`;
}
