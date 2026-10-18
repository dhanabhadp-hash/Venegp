import { DutyShift, FlexCardConfig, DEFAULT_FLEX_CARD_CONFIG } from '../types/roster';

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

/**
 * Truncate string safely for LINE API limits
 */
function safeString(text: string | undefined, defaultVal: string, maxLength?: number): string {
  const val = (text && text.trim().length > 0 ? text.trim() : defaultVal);
  if (maxLength && val.length > maxLength) {
    return val.slice(0, maxLength);
  }
  return val;
}

export function buildDutyFlexMessage(
  shift: DutyShift,
  advanceNoticeText?: string,
  customConfig?: Partial<FlexCardConfig>
) {
  const cfg: FlexCardConfig = { ...DEFAULT_FLEX_CARD_CONFIG, ...(customConfig || {}) };
  const noticeTitle = safeString(advanceNoticeText, cfg.defaultTitle, 100);
  
  // Shift badge color
  const badgeColor = shift.shiftType === 'morning' ? '#059669' : '#D97706';
  const hospitalText = safeString(cfg.hospitalName, 'รพ.สบปราบ • เภสัชกรรม', 60);
  const badgeTag = safeString(cfg.badgeText, 'DUTY NOTIFIER', 30);
  const btn1Label = safeString(cfg.button1Label, 'รับทราบเวร', 20);
  const btn1Text = safeString(
    cfg.button1Text,
    `รับทราบการอยู่เวรวันที่ ${shift.date} (${shift.shiftName}) เรียบร้อยครับ/ค่ะ`,
    300
  );

  const footerContents: any[] = [
    {
      type: 'button',
      style: 'primary',
      color: cfg.button1Color || '#06C755',
      action: {
        type: 'message',
        label: btn1Label,
        text: btn1Text,
      },
    },
  ];

  if (cfg.showButton2) {
    const btn2Label = safeString(cfg.button2Label, 'ขอแลกเวร', 20);
    const btn2Text = safeString(
      cfg.button2Text,
      `ขอแจ้งแลกเวร วันที่ ${shift.date} (${shift.shiftName}) ติดภารกิจ`,
      300
    );
    footerContents.push({
      type: 'button',
      style: 'secondary',
      action: {
        type: 'message',
        label: btn2Label,
        text: btn2Text,
      },
    });
  }

  const bodyContents: any[] = [
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
          text: safeString(shift.staffName, 'เจ้าหน้าที่', 50),
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
              text: safeString(cfg.dateLabel, '📅 วันที่ปฏิบัติงาน:', 30),
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
              type: 'text',
              text: `${shift.shiftName} (${shift.startTime}-${shift.endTime})`,
              weight: 'bold',
              size: 'sm',
              color: badgeColor,
              flex: 5,
              wrap: true,
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
              text: safeString(shift.department, hospitalText, 50),
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
              text: safeString(shift.location, 'ประจำจุดปฏิบัติงาน', 50),
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
              text: safeString(shift.notes, 'กรุณาตรงต่อเวลา เตรียมพร้อมอุปกรณ์', 100),
              size: 'sm',
              color: '#64748B',
              flex: 5,
              wrap: true,
            },
          ],
        },
      ],
    },
  ];

  if (cfg.showAdviceBox && cfg.adviceText) {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      backgroundColor: '#F8FAFC',
      cornerRadius: 'md',
      paddingAll: 'md',
      contents: [
        {
          type: 'text',
          text: safeString(cfg.adviceText, '💡 ข้อแนะนำ: กรุณาตรงต่อเวลา', 200),
          size: 'xs',
          color: '#64748B',
          wrap: true,
        },
      ],
    });
  }

  const altTitle = safeString(`[แจ้งเตือนอยู่เวร] ${shift.staffName} - ${shift.shiftName} (${shift.date})`, 'แจ้งเตือนอยู่เวร', 400);

  return {
    type: 'flex',
    altText: altTitle,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: cfg.headerBgColor || '#18181B',
        paddingAll: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: hospitalText,
                weight: 'bold',
                size: 'xs',
                color: cfg.headerTextColor || '#10B981',
              },
              {
                type: 'text',
                text: badgeTag,
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
            wrap: true,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        backgroundColor: '#FFFFFF',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#FFFFFF',
        paddingAll: 'md',
        contents: footerContents,
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
  timingDetail: string,
  customConfig?: Partial<FlexCardConfig>
) {
  const cfg: FlexCardConfig = { ...DEFAULT_FLEX_CARD_CONFIG, ...(customConfig || {}) };
  const morningShifts = dayShifts.filter(s => s.shiftType === 'morning');
  const afternoonShifts = dayShifts.filter(s => s.shiftType === 'afternoon');

  const hospitalText = safeString(cfg.hospitalName, 'รพ.สบปราบ • เภสัชกรรม', 60);
  const badgeTag = safeString(cfg.badgeText, 'GROUP BROADCAST', 30);
  const displayTitle = safeString(slotTitle, cfg.defaultTitle, 100);
  const morningLabel = safeString(cfg.morningShiftLabel, '🌅 กะเช้า OT (08:30 - 16:30 น.)', 60);
  const afternoonLabel = safeString(cfg.afternoonShiftLabel, '🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)', 60);
  const noShiftText = safeString(cfg.noShiftNotice, 'ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้', 60);
  const dateLabel = safeString(cfg.dateLabel, '📅 ประจำวันที่:', 30);
  const timingPrefix = safeString(cfg.timingPrefix, 'รายละเอียด:', 30);
  const btn1Label = safeString(cfg.button1Label, 'รับทราบตารางเวร', 20);
  const btn1Text = safeString(
    cfg.button1Text,
    `รับทราบตารางเวรประจำวันที่ ${dateStr} เรียบร้อยครับ/ค่ะ`,
    300
  );

  const staffItems: any[] = [];

  if (morningShifts.length > 0) {
    staffItems.push({
      type: 'box',
      layout: 'vertical',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: morningLabel,
          size: 'xs',
          weight: 'bold',
          color: '#059669',
          wrap: true,
        },
        ...morningShifts.map(s => ({
          type: 'text',
          text: `• ${safeString(s.staffName, 'เจ้าหน้าที่')}`,
          size: 'sm',
          color: '#18181B',
          margin: 'xs',
          weight: 'bold',
          wrap: true,
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
          text: afternoonLabel,
          size: 'xs',
          weight: 'bold',
          color: '#D97706',
          wrap: true,
        },
        ...afternoonShifts.map(s => ({
          type: 'text',
          text: `• ${safeString(s.staffName, 'เจ้าหน้าที่')}`,
          size: 'sm',
          color: '#18181B',
          margin: 'xs',
          weight: 'bold',
          wrap: true,
        })),
      ],
    });
  }

  if (staffItems.length === 0) {
    staffItems.push({
      type: 'text',
      text: noShiftText,
      size: 'sm',
      color: '#71717A',
      wrap: true,
    });
  }

  const footerContents: any[] = [
    {
      type: 'button',
      style: 'primary',
      color: cfg.button1Color || '#06C755',
      action: {
        type: 'message',
        label: btn1Label,
        text: btn1Text,
      },
    },
  ];

  if (cfg.showButton2) {
    const btn2Label = safeString(cfg.button2Label, 'ขอแลกเวร', 20);
    const btn2Text = safeString(
      cfg.button2Text,
      `ขอแจ้งแลกเวร วันที่ ${dateStr} ติดภารกิจ`,
      300
    );
    footerContents.push({
      type: 'button',
      style: 'secondary',
      action: {
        type: 'message',
        label: btn2Label,
        text: btn2Text,
      },
    });
  }

  const bodyContents: any[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: dateLabel,
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
      contents: [
        {
          type: 'text',
          text: safeString(cfg.staffSectionTitle, '👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน:', 40),
          size: 'xs',
          color: '#64748B',
          weight: 'bold',
        },
        ...staffItems,
      ],
    },
  ];

  if (timingDetail) {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      backgroundColor: '#F4F4F5',
      cornerRadius: 'md',
      paddingAll: 'md',
      contents: [
        {
          type: 'text',
          text: `${timingPrefix} ${timingDetail}`,
          size: 'xs',
          color: '#52525B',
          wrap: true,
        },
      ],
    });
  }

  if (cfg.showAdviceBox && cfg.adviceText) {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      backgroundColor: '#F8FAFC',
      cornerRadius: 'md',
      paddingAll: 'md',
      contents: [
        {
          type: 'text',
          text: safeString(cfg.adviceText, '💡 ข้อแนะนำ: กรุณาตรงต่อเวลา', 200),
          size: 'xs',
          color: '#64748B',
          wrap: true,
        },
      ],
    });
  }

  const altTitle = safeString(`[ประกาศกลุ่มเวร] ${hospitalText} ประจำวันที่ ${dateStr}`, 'ประกาศกลุ่มเวร', 400);

  return {
    type: 'flex',
    altText: altTitle,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: cfg.headerBgColor || '#18181B',
        paddingAll: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: hospitalText,
                weight: 'bold',
                size: 'xs',
                color: cfg.headerTextColor || '#10B981',
              },
              {
                type: 'text',
                text: badgeTag,
                size: 'xxs',
                color: '#A1A1AA',
                align: 'end',
              },
            ],
          },
          {
            type: 'text',
            text: displayTitle,
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
            margin: 'sm',
            wrap: true,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        backgroundColor: '#FFFFFF',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#FFFFFF',
        paddingAll: 'md',
        contents: footerContents,
      },
    },
  };
}

export function buildGroupRosterTextMessage(
  dayShifts: DutyShift[],
  dateStr: string,
  slotTitle: string,
  timingDetail: string,
  customConfig?: Partial<FlexCardConfig>
) {
  const cfg: FlexCardConfig = { ...DEFAULT_FLEX_CARD_CONFIG, ...(customConfig || {}) };
  const morningShifts = dayShifts.filter(s => s.shiftType === 'morning');
  const afternoonShifts = dayShifts.filter(s => s.shiftType === 'afternoon');

  let staffListText = '';
  if (morningShifts.length > 0) {
    staffListText += `\n• ${cfg.morningShiftLabel}:\n  ` + morningShifts.map(s => s.staffName).join(', ');
  }
  if (afternoonShifts.length > 0) {
    staffListText += `\n• ${cfg.afternoonShiftLabel}:\n  ` + afternoonShifts.map(s => s.staffName).join(', ');
  }
  if (!staffListText) {
    staffListText = `\n${cfg.noShiftNotice}`;
  }

  const adviceSection = cfg.showAdviceBox && cfg.adviceText ? `\n\n${cfg.adviceText}` : '';

  return `[${slotTitle}]
${cfg.hospitalName}
${cfg.dateLabel} ${dateStr}

${cfg.staffSectionTitle}${staffListText}

${cfg.timingPrefix} ${timingDetail}${adviceSection}

กรุณาตอบกลับข้อความนี้เพื่อยืนยันการรับทราบเวรในกลุ่ม ขอบคุณครับ/ค่ะ`;
}

export const FLEX_CARD_PRESETS: {
  id: string;
  name: string;
  description: string;
  config: Partial<FlexCardConfig>;
}[] = [
  {
    id: 'sobprap-default',
    name: 'รพ.สบปราบ • เภสัชกรรม (ค่าเริ่มต้น)',
    description: 'มาตรฐานกลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค รพ.สบปราบ',
    config: {
      hospitalName: 'รพ.สบปราบ • เภสัชกรรม',
      badgeText: 'GROUP BROADCAST',
      headerBgColor: '#18181B',
      headerTextColor: '#10B981',
      dateLabel: '📅 ประจำวันที่:',
      staffSectionTitle: '👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน:',
      morningShiftLabel: '🌅 กะเช้า OT (08:30 - 16:30 น.)',
      afternoonShiftLabel: '🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)',
      noShiftNotice: 'ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้',
      adviceText: '💡 ข้อแนะนำ: หากติดภารกิจต้องการแลกเวร กรุณาแจ้งหัวหน้าเวรล่วงหน้าอย่างน้อย 24 ชั่วโมง',
      button1Label: 'รับทราบตารางเวร',
      button1Text: 'รับทราบตารางเวรประจำวันเรียบร้อยครับ/ค่ะ',
      button1Color: '#06C755',
      showButton2: true,
      button2Label: 'ขอแลกเวร',
      button2Text: 'ขอแจ้งแลกเวร ติดภารกิจด่วน',
    },
  },
  {
    id: 'nursing-ward',
    name: 'กลุ่มงานพยาบาล / วอร์ดผู้ป่วยใน',
    description: 'เน้นส่งมอบเวร เช็คความพร้อมคนไข้และอุปกรณ์ทางการแพทย์',
    config: {
      hospitalName: 'รพ.สบปราบ • กลุ่มงานการพยาบาล',
      badgeText: 'WARD SHIFT REPORT',
      headerBgColor: '#0F172A',
      headerTextColor: '#38BDF8',
      dateLabel: '📅 เวรประจำวันที่:',
      staffSectionTitle: '👩‍⚕️ รายชื่อพยาบาลและผู้ช่วยขึ้นเวร:',
      morningShiftLabel: '☀️ เวรเช้า (08:00 - 16:00 น.)',
      afternoonShiftLabel: '🌙 เวรบ่าย (16:00 - 24:00 น.)',
      noShiftNotice: 'ไม่มีพยาบาลขึ้นเวรในผลัดนี้',
      adviceText: '🔔 กรุณามาก่อนเวลา 15 นาทีเพื่อรับมอบเวรและสัญญาณชีพผู้ป่วย',
      button1Label: 'รับทราบและพร้อมขึ้นเวร',
      button1Text: 'รับทราบและพร้อมขึ้นเวรเรียบร้อยครับ/ค่ะ',
      button1Color: '#0284C7',
      showButton2: true,
      button2Label: 'แจ้งแลกเวรพยาบาล',
      button2Text: 'ขอแจ้งแลกเวรพยาบาล ติดภารกิจด่วน',
    },
  },
  {
    id: 'minimal-compact',
    name: 'แบบกระชับ สั้นได้ใจความ (Compact)',
    description: 'ตัวอักษรกระชับ ปุ่มเดี่ยว ไม่รกสายตา เหมาะกับกลุ่มคุยงานด่วน',
    config: {
      hospitalName: 'สรุปเวรประจำวัน',
      badgeText: 'DUTY ALERT',
      headerBgColor: '#27272A',
      headerTextColor: '#FBBF24',
      dateLabel: 'วันที่:',
      staffSectionTitle: 'ผู้ปฏิบัติงาน:',
      morningShiftLabel: 'กะเช้า (08:30 - 16:30):',
      afternoonShiftLabel: 'กะบ่าย (16:00 - 20:00):',
      noShiftNotice: 'ไม่มีเวร',
      showAdviceBox: false,
      adviceText: '',
      button1Label: 'รับทราบแล้ว',
      button1Text: 'รับทราบครับ/ค่ะ',
      button1Color: '#10B981',
      showButton2: false,
    },
  },
];


