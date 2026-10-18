import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Key,
  CheckCircle2,
  AlertCircle,
  Send,
  Smartphone,
  Clock,
  Settings2,
  Copy,
  Users,
  Eye,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Sun,
  Sunset,
  Calendar,
  Sparkles,
  Check,
  SlidersHorizontal,
  Layers,
  Radio,
  Share2,
} from 'lucide-react';
import {
  DutyShift,
  NotificationRule,
  NotificationLog,
  FlexCardConfig,
  DEFAULT_FLEX_CARD_CONFIG,
} from '../types/roster';
import {
  testLineChannelToken,
  sendLinePushMessage,
  sendLineBroadcastMessage,
  buildDutyFlexMessage,
  buildDutyTextMessage,
  buildGroupRosterFlexMessage,
  buildGroupRosterTextMessage,
  getLineServerConfig,
  LineBotInfo,
} from '../services/lineApi';
import {
  STRICT_NOTIFICATION_RULES,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  isWeekendOrHoliday,
  HOSPITAL_INFO,
} from '../data/mockRosters';
import confetti from 'canvas-confetti';
import { saveNotificationLog, saveUserSettings } from '../services/googleSheetsDb';
import { FlexCardCustomizer } from './FlexCardCustomizer';

interface LineNotifierProps {
  shifts: DutyShift[];
  onUpdateShifts: (shifts: DutyShift[]) => void;
  channelAccessToken: string;
  setChannelAccessToken: (token: string) => void;
  singleShiftToNotify?: DutyShift | null;
  onClearSingleNotify?: () => void;
}

export const LineNotifier: React.FC<LineNotifierProps> = ({
  shifts,
  onUpdateShifts,
  channelAccessToken,
  setChannelAccessToken,
  singleShiftToNotify,
  onClearSingleNotify,
}) => {
  const [botInfo, setBotInfo] = useState<LineBotInfo | null>(null);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<{
    hasServerSecret: boolean;
    envGroupId: string;
    envUserId: string;
  }>({ hasServerSecret: false, envGroupId: '', envUserId: '' });

  // Group Notification Target
  const [targetMode, setTargetMode] = useState<'group' | 'broadcast' | 'user'>('group');
  const [lineGroupId, setLineGroupId] = useState<string>(() => {
    return localStorage.getItem('duty_line_group_id') || 'C0123456789abcdef0123456789abcde';
  });
  const [testUserId, setTestUserId] = useState<string>('Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');

  // Trigger rules (Strict: Weekday 15:55, Weekday 20:00, Weekend/Holiday 07:55)
  const [rules] = useState<NotificationRule[]>(STRICT_NOTIFICATION_RULES);
  const [messageMode, setMessageMode] = useState<'flex' | 'text'>('flex');

  // Load server config and verify token if present
  useEffect(() => {
    getLineServerConfig().then(cfg => {
      setServerConfig(cfg);
      if (cfg.envGroupId && !localStorage.getItem('duty_line_group_id')) {
        setLineGroupId(cfg.envGroupId);
      }
      if (cfg.envUserId) {
        setTestUserId(cfg.envUserId);
      }
      if (cfg.hasServerSecret || channelAccessToken.trim()) {
        testLineChannelToken(channelAccessToken || undefined)
          .then(info => {
            setBotInfo(info);
            setTokenError(null);
          })
          .catch(err => {
            console.warn('Initial Bot info check:', err);
          });
      }
    });
  }, [channelAccessToken]);

  // Selected date for group announcement simulation
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    shifts.forEach(s => set.add(s.date));
    return Array.from(set).sort();
  }, [shifts]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return uniqueDates.includes('2026-10-16') ? '2026-10-16' : (uniqueDates[0] || '2026-10-01');
  });

  const [previewShiftIndex, setPreviewShiftIndex] = useState(0);

  // Status and logs
  const [isSending, setIsSending] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string; payload?: any } | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // Flex Card Customizer Config
  const [flexConfig, setFlexConfig] = useState<FlexCardConfig>(() => {
    const saved = localStorage.getItem('duty_flex_card_config');
    if (saved) {
      try {
        return { ...DEFAULT_FLEX_CARD_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed parsing saved flex config', e);
      }
    }
    return DEFAULT_FLEX_CARD_CONFIG;
  });

  // Save flexConfig changes
  useEffect(() => {
    localStorage.setItem('duty_flex_card_config', JSON.stringify(flexConfig));
  }, [flexConfig]);

  // Sub-tabs
  const [subTab, setSubTab] = useState<'group-setup' | 'flex-customizer' | 'preview' | 'staff' | 'apps-script'>('group-setup');
  const [copiedScript, setCopiedScript] = useState(false);

  // Save Group ID to localStorage
  useEffect(() => {
    if (lineGroupId) {
      localStorage.setItem('duty_line_group_id', lineGroupId);
    }
  }, [lineGroupId]);

  const previewShift = singleShiftToNotify || shifts[previewShiftIndex] || shifts[0];
  const shiftsOnSelectedDate = useMemo(() => {
    return shifts.filter(s => s.date === selectedDate);
  }, [shifts, selectedDate]);

  const isSelectedDateHoliday = useMemo(() => {
    return isWeekendOrHoliday(selectedDate);
  }, [selectedDate]);

  const handleTestToken = async () => {
    setIsTestingToken(true);
    setTokenError(null);
    try {
      const info = await testLineChannelToken(channelAccessToken || undefined);
      setBotInfo(info);
      setTokenError(null);
    } catch (err: any) {
      setTokenError(
        err.message || 'ไม่สามารถเชื่อมต่อ LINE Bot ได้ กรุณาตรวจสอบ Token หรือตั้งค่าความลับ (Secrets)'
      );
      setBotInfo(null);
    } finally {
      setIsTestingToken(false);
    }
  };

  /**
   * Send notification into 1 LINE Group (or broadcast / individual user)
   * Supports both live API dispatch (when token is provided) and high-fidelity test simulation
   */
  const handleSendGroupBroadcast = async (
    slotName: 'weekday_1555' | 'weekday_2000' | 'weekend_0755',
    dateToUse?: string,
    isSimulation = false
  ) => {
    const targetDate = dateToUse || selectedDate;
    const targetShifts = shifts.filter(s => s.date === targetDate);

    let slotTitle = '';
    let timingDetail = '';
    let triggerText = '';

    if (slotName === 'weekday_1555') {
      slotTitle = flexConfig.weekday1555Title || '📢 แจ้งเตือนกะบ่าย (เวลา 15:55 น.) • วันจันทร์ - ศุกร์';
      timingDetail = flexConfig.weekday1555Desc || 'อีก 5 นาทีจะเริ่มเวลาปฏิบัติงานกะบ่าย (16:00 - 20:00 น.) ขอให้เจ้าหน้าที่เข้าปฏิบัติงานและตรวจเช็คเอกสารยา';
      triggerText = '15:55 น. (จันทร์-ศุกร์ ครั้งที่ 1)';
    } else if (slotName === 'weekday_2000') {
      slotTitle = flexConfig.weekday2000Title || '📋 แจ้งเตือนปิดกะบ่าย & ส่งมอบเวร (เวลา 20:00 น.) • วันจันทร์ - ศุกร์';
      timingDetail = flexConfig.weekday2000Desc || 'สิ้นสุดเวลาปฏิบัติงานกะบ่าย 20:00 น. ขอให้สรุปยอดเอกสาร ปิดระบบ และลงบันทึกรายงานให้เรียบร้อย';
      triggerText = '20:00 น. (จันทร์-ศุกร์ ครั้งที่ 2)';
    } else {
      slotTitle = flexConfig.weekend0755Title || '🌅 แจ้งเตือนเวรเช้าวันหยุด (เวลา 07:55 น.) • เสาร์ - อาทิตย์ / นักขัตฤกษ์';
      timingDetail = flexConfig.weekend0755Desc || 'เวรวันหยุด เช้า OT (08:30 - 16:30 น.) บริหารจัดการคลังยา เอกสาร และเวชภัณฑ์';
      triggerText = '07:55 น. (เสาร์-อาทิตย์/นักขัตฤกษ์)';
    }

    const messages =
      messageMode === 'flex'
        ? [buildGroupRosterFlexMessage(targetShifts, targetDate, slotTitle, timingDetail, flexConfig)]
        : [{ type: 'text', text: buildGroupRosterTextMessage(targetShifts, targetDate, slotTitle, timingDetail, flexConfig) }];

    const staffSummary = targetShifts.map(s => s.staffName).join(', ') || 'ไม่มีเจ้าหน้าที่ในวันนี้';

    // If simulation mode or neither token nor server secret is available, execute simulation test
    if (isSimulation || (!channelAccessToken.trim() && !serverConfig.hasServerSecret)) {
      setIsSending(true);
      await new Promise(r => setTimeout(r, 400));
      setIsSending(false);

      setActionResult({
        success: true,
        message: `[ทดสอบจำลองสำเร็จ] ระบบประมวลผลข้อมูลวันที่ ${targetDate} (${triggerText}) พบผู้มีเวร: ${staffSummary} สร้าง Flex Card และ Plain Text พร้อมส่งเข้ากลุ่มไลน์ (${lineGroupId || 'กลุ่มงานเภสัชกรรม'}) เรียบร้อยแล้ว (ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน Secrets เพื่อส่งข้อความจริงเข้าแชทบอท)`,
        payload: messages,
      });

      confetti({ particleCount: 50, spread: 60 });

      setLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('th-TH'),
          staffName: `[ทดสอบกลุ่มเวร] ${staffSummary}`,
          lineUserId: targetMode === 'group' ? (lineGroupId || 'SIMULATED_GROUP') : 'SIMULATED',
          shiftDate: targetDate,
          shiftName: slotTitle,
          triggerTimeText: `${triggerText} [SIMULATION]`,
          status: 'success',
          messageType: messageMode,
        },
        ...prev,
      ]);
      return;
    }

    if (targetMode === 'group' && !lineGroupId.trim()) {
      setActionResult({
        success: false,
        message: 'กรุณาระบุ LINE Group ID สำหรับส่งเข้ากลุ่มไลน์ (เช่น C0123456789abcdef...)',
      });
      return;
    }

    if (targetMode === 'user' && !testUserId.trim()) {
      setActionResult({
        success: false,
        message: 'กรุณาระบุ LINE User ID สำหรับการส่งรายบุคคล (เช่น U1234567890abcdef...)',
      });
      return;
    }

    setIsSending(true);
    setActionResult(null);

    try {

      let destinationName = '';
      if (targetMode === 'group') {
        destinationName = `กลุ่มไลน์ (${lineGroupId.substring(0, 10)}...)`;
        await sendLinePushMessage(channelAccessToken, lineGroupId.trim(), messages);
      } else if (targetMode === 'broadcast') {
        destinationName = 'Broadcast ทั้งแชนแนล';
        await sendLineBroadcastMessage(channelAccessToken, messages);
      } else {
        destinationName = `User ID (${testUserId.substring(0, 10)}...)`;
        await sendLinePushMessage(channelAccessToken, testUserId.trim(), messages);
      }

      setActionResult({
        success: true,
        message: `ส่งข้อความแจ้งเตือน [${triggerText}] ไปยัง ${destinationName} ประจำวันที่ ${targetDate} สำเร็จแล้ว!`,
      });

      confetti({ particleCount: 45, spread: 60 });

      const staffSummary = targetShifts.map(s => s.staffName).join(', ') || 'ไม่มีเจ้าหน้าที่ในวันนี้';
      saveNotificationLog({
        staffName: `[กลุ่มเวร] ${staffSummary}`,
        lineUserId: targetMode === 'group' ? lineGroupId : targetMode === 'broadcast' ? 'BROADCAST' : testUserId,
        shiftDate: targetDate,
        shiftName: slotTitle,
        triggerTimeText: triggerText,
        status: 'success',
        messageType: messageMode,
      });
      setLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('th-TH'),
          staffName: `[กลุ่มเวร] ${staffSummary}`,
          lineUserId: targetMode === 'group' ? lineGroupId : targetMode === 'broadcast' ? 'BROADCAST' : testUserId,
          shiftDate: targetDate,
          shiftName: slotTitle,
          triggerTimeText: triggerText,
          status: 'success',
          messageType: messageMode,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setActionResult({
        success: false,
        message: err.message || 'ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบ Token และสิทธิ์การเข้าถึงกลุ่มไลน์',
      });

      setLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('th-TH'),
          staffName: '[กลุ่มเวร] ส่งไม่สำเร็จ',
          lineUserId: targetMode === 'group' ? lineGroupId : targetMode === 'broadcast' ? 'BROADCAST' : testUserId,
          shiftDate: targetDate,
          shiftName: slotTitle,
          triggerTimeText: triggerText,
          status: 'failed',
          messageType: messageMode,
          error: err.message,
        },
        ...prev,
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyScript = () => {
    let customized = GOOGLE_APPS_SCRIPT_TEMPLATE.replace(
      'YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE',
      channelAccessToken || 'YOUR_CHANNEL_ACCESS_TOKEN'
    );
    customized = customized.replace(
      'YOUR_LINE_GROUP_ID_HERE',
      lineGroupId || 'YOUR_LINE_GROUP_ID'
    );
    navigator.clipboard.writeText(customized);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Swiss Modernism Settings & Target Configuration */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              LINE OA Messaging API • ส่งเข้ากลุ่มไลน์ 1 กลุ่ม (Group Broadcast)
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              ระบบส่งแจ้งเตือนการอยู่เวรอัตโนมัติเข้ากลุ่มไลน์
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              แจ้งเตือนอัตโนมัติตามวันที่ที่มีข้อมูลการอยู่เวร • วันจันทร์ - ศุกร์ ส่ง 2 เวลา (15:55 น. และ 20:00 น.) • วันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ ส่ง 1 เวลา (07:55 น.)
            </p>
          </div>

          {botInfo && (
            <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-700/80 px-3.5 py-1.5 rounded-lg shrink-0">
              {botInfo.pictureUrl ? (
                <img src={botInfo.pictureUrl} alt="Bot" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
              <div className="text-xs font-mono text-neutral-200">
                <span className="font-semibold text-white">{botInfo.displayName}</span>
                <span className="text-neutral-500 ml-1.5">({botInfo.basicId})</span>
              </div>
            </div>
          )}
        </div>

        {/* Secret Status & Instructions */}
        {serverConfig.hasServerSecret ? (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>การตั้งค่าความลับ (Secrets):</strong> ตรวจพบ <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-200">LINE_CHANNEL_ACCESS_TOKEN</code> ในระบบ พร้อมส่งแจ้งเตือนจริงแล้ว
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-900 text-emerald-300 font-bold">
              ENV ACTIVE
            </span>
          </div>
        ) : (
          <div className="mt-4 p-3.5 rounded-lg bg-[#18181B] border border-neutral-800 text-xs text-neutral-300 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>การตั้งค่าความลับ (Secrets Configuration):</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              ท่านสามารถเพิ่มตัวแปรใน <strong>Secrets</strong> ของระบบ เพื่อให้บอททำงานอัตโนมัติอย่างปลอดภัยโดยไม่ต้องกรอกโทเค็นซ้ำ:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                <span className="text-emerald-400 font-bold">LINE_CHANNEL_ACCESS_TOKEN</span>: โทเค็นระยะยาวจาก LINE Developers
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                <span className="text-emerald-400 font-bold">LINE_GROUP_ID</span>: รหัสกลุ่มไลน์ของทีม (ขึ้นต้นด้วย C)
              </div>
            </div>
          </div>
        )}

        {/* Channel Access Token Input */}
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-9">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                LINE Channel Access Token (Long-Lived)
              </label>
              {serverConfig.hasServerSecret && (
                <span className="text-[10px] font-mono text-emerald-400">
                  (มีค่าเริ่มต้นจาก Secrets แล้ว สามารถวางค่าใหม่เพื่อ Override ได้)
                </span>
              )}
            </div>
            <input
              type="password"
              value={channelAccessToken}
              onChange={e => setChannelAccessToken(e.target.value)}
              placeholder={
                serverConfig.hasServerSecret
                  ? 'เชื่อมต่อผ่าน LINE_CHANNEL_ACCESS_TOKEN ใน Secrets แล้ว (หรือวาง Token ใหม่)'
                  : 'วาง Channel Access Token จาก LINE Developers Console'
              }
              className="w-full bg-[#18181B] border border-neutral-800 text-neutral-100 rounded-lg px-3.5 py-2.5 text-xs font-mono placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div className="col-span-12 md:col-span-3 flex items-end">
            <button
              onClick={handleTestToken}
              disabled={isTestingToken}
              className="w-full h-[38px] bg-white text-black hover:bg-neutral-200 disabled:opacity-50 rounded-lg font-semibold text-xs tracking-wide transition-colors active:translate-y-px flex items-center justify-center gap-2"
            >
              {isTestingToken ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ทดสอบเชื่อมต่อ LINE Bot
                </>
              )}
            </button>
          </div>
        </div>

        {tokenError && (
          <div className="mt-3 p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{tokenError}</span>
          </div>
        )}

        {/* 1 LINE Group Target Configuration Card */}
        <div className="mt-5 pt-5 border-t border-neutral-800/80">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-4">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                เป้าหมายการส่งข้อความ (Target Destination)
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#18181B] p-1 rounded-lg border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTargetMode('group')}
                  className={`py-1.5 px-2 rounded font-medium transition-colors text-center ${
                    targetMode === 'group'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  กลุ่มไลน์ (1 กลุ่ม)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('broadcast')}
                  className={`py-1.5 px-2 rounded font-medium transition-colors text-center ${
                    targetMode === 'broadcast'
                      ? 'bg-neutral-700 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  บอร์ดแคส
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('user')}
                  className={`py-1.5 px-2 rounded font-medium transition-colors text-center ${
                    targetMode === 'user'
                      ? 'bg-neutral-700 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ส่งรายคน
                </button>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
              {targetMode === 'group' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      LINE Group ID (รหัสกลุ่มไลน์ที่เชิญบอทเข้าไป)
                    </label>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      ขึ้นต้นด้วย C (ความยาว 33 ตัวอักษร)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={lineGroupId}
                    onChange={e => setLineGroupId(e.target.value)}
                    placeholder="เช่น C0123456789abcdef0123456789abcde"
                    className="w-full bg-[#18181B] border border-neutral-800 text-emerald-400 rounded-lg px-3.5 py-2 text-xs font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    💡 <strong>แนะนำ:</strong> เชิญ LINE Bot เข้าร่วมกลุ่มไลน์ของแผนก (กลุ่มงานเภสัชกรรม รพ.สบปราบ) บอทจะส่งสรุปรายชื่อคนขึ้นเวรในแต่ละวันเข้ากลุ่มนี้โดยตรง
                  </p>
                </div>
              )}

              {targetMode === 'broadcast' && (
                <div className="p-3 bg-[#18181B] border border-neutral-800 rounded-lg text-xs text-neutral-300">
                  <div className="font-semibold text-white mb-0.5">ส่งแบบ Broadcast (LINE Broadcast API)</div>
                  <div className="text-[11px] text-neutral-400">
                    ระบบจะส่งข้อความแจ้งเตือนถึงเพื่อนทุกคนที่เป็นสมาชิก/ติดตาม LINE Official Account นี้
                  </div>
                </div>
              )}

              {targetMode === 'user' && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    LINE User ID (ขึ้นต้นด้วย U)
                  </label>
                  <input
                    type="text"
                    value={testUserId}
                    onChange={e => setTestUserId(e.target.value)}
                    placeholder="เช่น Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
                    className="w-full bg-[#18181B] border border-neutral-800 text-sky-400 rounded-lg px-3.5 py-2 text-xs font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Target Shift Banner if navigated from single click in table */}
      {singleShiftToNotify && (
        <div className="bg-[#18181B] border border-neutral-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                เลือกแจ้งเตือนสำหรับ: {singleShiftToNotify.staffName}
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
                วันที่ {singleShiftToNotify.date} • {singleShiftToNotify.shiftName} ({singleShiftToNotify.startTime} - {singleShiftToNotify.endTime} น.)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedDate(singleShiftToNotify.date);
                if (isWeekendOrHoliday(singleShiftToNotify.date)) {
                  handleSendGroupBroadcast('weekend_0755', singleShiftToNotify.date);
                } else {
                  handleSendGroupBroadcast('weekday_1555', singleShiftToNotify.date);
                }
              }}
              disabled={isSending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              ส่งเข้ากลุ่มไลน์ทันทีสำหรับวันนี้
            </button>
            <button
              onClick={onClearSingleNotify}
              className="text-neutral-400 hover:text-white text-xs px-2 py-1"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* 2. Sub-Tabs Header */}
      <div className="flex border-b border-neutral-800 space-x-1 font-mono text-xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSubTab('group-setup')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'group-setup'
              ? 'border-white text-white font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>แจ้งเตือนกลุ่มไลน์ (3 เงื่อนไขเวลา)</span>
        </button>

        <button
          onClick={() => setSubTab('flex-customizer')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'flex-customizer'
              ? 'border-emerald-400 text-emerald-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>ปรับแต่งข้อความ Flex Card</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono">
            กำหนดเอง
          </span>
        </button>

        <button
          onClick={() => setSubTab('preview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'preview'
              ? 'border-white text-white font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>ตัวอย่างการ์ดในกลุ่มไลน์ (Flex Card)</span>
        </button>

        <button
          onClick={() => setSubTab('staff')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'staff'
              ? 'border-white text-white font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>รายชื่อเจ้าหน้าที่ ({shifts.reduce((acc, s) => acc.includes(s.staffName) ? acc : [...acc, s.staffName], [] as string[]).length} ท่าน)</span>
        </button>

        <button
          onClick={() => setSubTab('apps-script')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            subTab === 'apps-script'
              ? 'border-white text-white font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>สคริปต์อัตโนมัติ 24 ชม. (Google Apps Script)</span>
        </button>
      </div>

      {/* Sub-Tab 1: Group Notification & Simulated Trigger */}
      {subTab === 'group-setup' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Scheduled Trigger Dispatcher (7 cols) */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            {/* Condition Rules Overview */}
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3">
                SCHEDULED NOTIFICATION RULES (เงื่อนไขการส่งแจ้งเตือนเข้ากลุ่มไลน์)
              </div>

              <div className="space-y-3">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-3.5 rounded-lg border border-neutral-800 bg-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                          {rule.triggerTime} น.
                        </span>
                        <span className="text-xs font-semibold text-neutral-200">
                          {rule.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {rule.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {rule.dayCategory === 'weekday' ? 'จันทร์ - ศุกร์' : 'เสาร์ - อาทิตย์ / นักขัตฤกษ์'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Format Selection */}
              <div className="mt-5 pt-4 border-t border-neutral-800">
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  รูปแบบข้อความที่ส่งเข้ากลุ่มไลน์
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMessageMode('flex')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      messageMode === 'flex'
                        ? 'bg-neutral-800 border-white text-white'
                        : 'bg-[#18181B] border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-bold">LINE Flex Message Card</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      การ์ดสวยงาม จัดเรียงรายชื่อเจ้าหน้าที่ กะ และปุ่มรับทราบเวร
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMessageMode('text')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      messageMode === 'text'
                        ? 'bg-neutral-800 border-white text-white'
                        : 'bg-[#18181B] border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Plain Text (ข้อความธรรมดา)</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      ข้อความกระชับ อ่านง่าย เหมาะกับกลุ่มไลน์ทั่วไป
                    </div>
                  </button>
                </div>

                {messageMode === 'flex' && (
                  <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-300">
                      💡 ปรับแต่งข้อความในการ์ด: <strong>{flexConfig.hospitalName}</strong> • ปุ่ม <strong>{flexConfig.button1Label}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSubTab('flex-customizer')}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      ปรับแต่งข้อความการ์ด
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Test Trigger Dispatcher Card for 1 Group */}
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    INSTANT GROUP DISPATCH TEST
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    ทดสอบส่งข้อความเข้ากลุ่มไลน์ (ตามวันที่และเงื่อนไขเวลา)
                  </h3>
                </div>

                <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-2 py-1 rounded text-neutral-300">
                  เป้าหมาย: {targetMode === 'group' ? 'กลุ่มไลน์' : targetMode === 'broadcast' ? 'Broadcast' : 'User'}
                </span>
              </div>
              {/* Special Test Showcase for 16/10/69 requested by user */}
              <div className="mb-5 p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-500/20 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-300">
                      ผลการวิเคราะห์ & ทดสอบแจ้งเตือน: วันที่ 16 ตุลาคม 2569 (16/10/69)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    วันศุกร์ • วันทำการปกติ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3.5">
                  <div className="bg-[#18181B] p-2.5 rounded border border-neutral-800 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-neutral-400">
                      เจ้าหน้าที่อยู่เวรจริงในชีท ({shifts.filter(s => s.date === '2026-10-16').length} ท่าน):
                    </div>
                    {shifts.filter(s => s.date === '2026-10-16').map((s, idx) => (
                      <div key={s.id} className="font-semibold text-white">
                        {idx + 1}. {s.staffName}
                      </div>
                    ))}
                    <div className="text-[11px] text-amber-400 font-mono">
                      กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)
                    </div>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded border border-neutral-800 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-neutral-400">รอบการส่งตามเกณฑ์ (จันทร์-ศุกร์ 2 เวลา):</div>
                    <div className="text-neutral-200 text-[11px]">
                      • <strong className="text-amber-400">ครั้งที่ 1 (15:55 น.):</strong> เตือนก่อนเริ่มกะบ่าย 5 นาที
                    </div>
                    <div className="text-neutral-200 text-[11px]">
                      • <strong className="text-sky-400">ครั้งที่ 2 (20:00 น.):</strong> เตือนปิดกะบ่าย สรุปเอกสาร & ส่งมอบเวร
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('2026-10-16');
                      handleSendGroupBroadcast('weekday_1555', '2026-10-16', true);
                    }}
                    disabled={isSending}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 active:translate-y-px"
                  >
                    <Sunset className="w-3.5 h-3.5" />
                    ทดสอบจำลองส่งรอบ 15:55 น. (16/10/69)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('2026-10-16');
                      handleSendGroupBroadcast('weekday_2000', '2026-10-16', true);
                    }}
                    disabled={isSending}
                    className="bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 active:translate-y-px"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    ทดสอบจำลองส่งรอบ 20:00 น. (16/10/69)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('2026-10-16');
                      handleSendGroupBroadcast('weekday_1555', '2026-10-16', false);
                    }}
                    disabled={isSending}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 active:translate-y-px"
                  >
                    <Send className="w-3.5 h-3.5" />
                    ส่งจริงเข้า LINE (ต้องมี Token)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('2026-10-16');
                      setSubTab('preview');
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-neutral-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    ดูตัวอย่างการ์ดวันที่ 16
                  </button>
                </div>
              </div>

              {/* Date Selector */}
              <div className="mb-4 p-3 bg-[#18181B] border border-neutral-800 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-[11px] font-mono text-neutral-300 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    เลือกวันที่ในตารางเวร (ตุลาคม 2569):
                  </label>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {isSelectedDateHoliday ? '🏖️ วันหยุด/เสาร์-อาทิตย์' : '💼 วันทำการ จันทร์-ศุกร์'}
                  </span>
                </div>

                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-[#121214] border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-neutral-500"
                >
                  {uniqueDates.map(date => {
                    const count = shifts.filter(s => s.date === date).length;
                    const isHol = isWeekendOrHoliday(date);
                    const staff = shifts.filter(s => s.date === date).map(s => s.staffName).join(', ');
                    return (
                      <option key={date} value={date}>
                        {date} ({isHol ? 'วันหยุด/เสาร์-อาทิตย์' : 'วันจันทร์-ศุกร์'}) • {count} ท่าน: {staff}
                      </option>
                    );
                  })}
                </select>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-neutral-500 font-mono">รายชื่อผู้มีเวรวันนี้:</span>
                  {shiftsOnSelectedDate.length > 0 ? (
                    shiftsOnSelectedDate.map(s => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-200"
                      >
                        {s.staffName} ({s.shiftName})
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-neutral-500">ไม่มีข้อมูลเวรในวันที่นี้</span>
                  )}
                </div>
              </div>

              {/* 3 Action Buttons for the 3 conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSendGroupBroadcast('weekday_1555')}
                  disabled={isSending}
                  className="p-3 bg-[#18181B] hover:bg-neutral-800 border border-neutral-700 text-white rounded-lg text-xs font-medium transition-colors text-left disabled:opacity-50 active:translate-y-px"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-400 font-bold text-sm">15:55 น.</span>
                    <Sunset className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-neutral-200 mt-1 font-semibold">กะบ่าย (จ.-ศ.) ครั้งที่ 1</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                    ส่งสรุปคนขึ้นเวรบ่าย 16:00 - 20:00 เข้ากลุ่ม
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendGroupBroadcast('weekday_2000')}
                  disabled={isSending}
                  className="p-3 bg-[#18181B] hover:bg-neutral-800 border border-neutral-700 text-white rounded-lg text-xs font-medium transition-colors text-left disabled:opacity-50 active:translate-y-px"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sky-400 font-bold text-sm">20:00 น.</span>
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-[11px] text-neutral-200 mt-1 font-semibold">ปิดกะบ่าย (จ.-ศ.) ครั้งที่ 2</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                    เตือนส่งมอบเวร & สรุปยอดเอกสารยา
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendGroupBroadcast('weekend_0755')}
                  disabled={isSending}
                  className="p-3 bg-[#18181B] hover:bg-neutral-800 border border-neutral-700 text-white rounded-lg text-xs font-medium transition-colors text-left disabled:opacity-50 active:translate-y-px"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-bold text-sm">07:55 น.</span>
                    <Sun className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-[11px] text-neutral-200 mt-1 font-semibold">เวรเช้าวันหยุด ครั้งที่ 1</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                    ส่งสรุปคนขึ้นเวรเช้า OT 08:30 - 16:30
                  </div>
                </button>
              </div>

              {actionResult && (
                <div
                  className={`mt-4 p-3.5 rounded-lg text-xs flex items-center gap-2.5 ${
                    actionResult.success
                      ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
                      : 'bg-red-950/30 border border-red-800/50 text-red-200'
                  }`}
                >
                  {actionResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{actionResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dispatch Audit Log & Real-time status (5 cols) */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                LINE GROUP DISPATCH TARGET
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                กลุ่มไลน์เป้าหมาย
              </h3>

              <div className="p-3 bg-[#18181B] border border-neutral-800 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">ชื่อหน่วยงาน:</span>
                  <span className="font-semibold text-white">กลุ่มงานเภสัชกรรม รพ.สบปราบ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">สถานะ Token:</span>
                  <span className={`font-mono text-[11px] ${botInfo ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    {botInfo ? '✅ เชื่อมต่อแล้ว' : '⚪ รอตรวจสอบ'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">LINE Group ID:</span>
                  <span className="font-mono text-[10px] text-emerald-400 truncate max-w-[170px]">
                    {lineGroupId || 'ยังไม่ได้ระบุ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Logs List */}
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  DISPATCH AUDIT LOG
                </span>
                <span className="text-[11px] font-mono text-neutral-500">{logs.length} รายการ</span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-10 text-neutral-600 text-xs font-mono">
                  ยังไม่มีประวัติการส่งข้อความ
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded border border-neutral-800/80 bg-[#18181B] text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-neutral-200">{log.staffName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {log.shiftDate} • {log.triggerTimeText}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            log.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {log.status === 'success' ? 'SENT' : 'FAIL'}
                        </span>
                        <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                          {log.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab: Flex Card Text & Design Customizer */}
      {subTab === 'flex-customizer' && (
        <FlexCardCustomizer
          config={flexConfig}
          onChangeConfig={setFlexConfig}
          sampleShifts={shifts}
          channelAccessToken={channelAccessToken}
          lineGroupId={lineGroupId}
          testUserId={testUserId}
          targetMode={targetMode}
          onSaveToCloud={async () => {
            saveUserSettings({
              lineChannelToken: channelAccessToken,
            });
          }}
        />
      )}

      {/* Sub-Tab 2: Phone Mockup Live Preview of Group Message */}
      {subTab === 'preview' && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6 flex justify-center px-2">
            {/* Phone Screen Mockup */}
            <div className="w-full max-w-[330px] bg-[#000000] rounded-[38px] p-3 border-2 border-neutral-800 shadow-2xl">
              <div className="w-20 h-3.5 bg-neutral-900 rounded-full mx-auto mb-2.5" />
              
              {/* Group Chat Top Bar */}
              <div className="bg-[#18181B] text-white px-3 py-2.5 rounded-t-xl flex items-center justify-between border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white font-mono">
                    Rx
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-none truncate max-w-[170px]">
                      {flexConfig.hospitalName || 'กลุ่มเวรเภสัชกรรม รพ.สบปราบ'}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono mt-0.5">LINE Group Chat</div>
                  </div>
                </div>
                <Users className="w-4 h-4 text-neutral-400" />
              </div>

              {/* Chat Messages Container */}
              <div className="bg-[#27272A] p-3 min-h-[480px] rounded-b-xl overflow-y-auto space-y-3 font-sans">
                {/* Bot Message Header */}
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 font-mono">
                  <span className="font-bold text-white">รพ.สบปราบ Bot</span>
                  <span className="bg-emerald-500/20 text-emerald-400 px-1 rounded text-[8px]">BOT</span>
                  <span className="text-neutral-500">15:55 น.</span>
                </div>

                {/* Rich Flex Card in Group */}
                <div className="bg-white rounded-xl overflow-hidden shadow-lg text-neutral-900 text-xs">
                  {/* Card Header */}
                  <div
                    style={{ backgroundColor: flexConfig.headerBgColor || '#18181B' }}
                    className="text-white p-3.5 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        style={{ color: flexConfig.headerTextColor || '#10B981' }}
                        className="text-[10px] font-mono font-bold tracking-wider truncate max-w-[170px]"
                      >
                        {flexConfig.hospitalName || 'รพ.สบปราบ • เภสัชกรรม'}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400">
                        {flexConfig.badgeText || 'GROUP BROADCAST'}
                      </span>
                    </div>
                    <div className="text-sm font-bold mt-1 text-white">
                      {isSelectedDateHoliday
                        ? (flexConfig.weekend0755Title || '🌅 แจ้งเตือนเวรเช้าวันหยุด (เวลา 07:55 น.)')
                        : (flexConfig.weekday1555Title || '📢 แจ้งเตือนกะบ่าย (เวลา 15:55 น.)')}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-baseline border-b border-neutral-100 pb-2">
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {flexConfig.dateLabel || '📅 ประจำวันที่:'}
                      </span>
                      <span className="font-bold text-xs text-neutral-900 font-mono">{selectedDate}</span>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-neutral-700 mb-1.5">
                        {flexConfig.staffSectionTitle || '👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงานอยู่เวร:'}
                      </div>
                      <div className="space-y-1.5">
                        {shiftsOnSelectedDate.length > 0 ? (
                          shiftsOnSelectedDate.map(s => (
                            <div
                              key={s.id}
                              className="p-2 rounded bg-neutral-50 border border-neutral-100 flex items-center justify-between"
                            >
                              <div className="font-semibold text-neutral-900 text-xs">
                                • {s.staffName}
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  s.shiftType === 'morning'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {s.shiftType === 'morning'
                                  ? (flexConfig.morningShiftLabel || s.shiftName)
                                  : (flexConfig.afternoonShiftLabel || s.shiftName)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-neutral-500 text-xs py-1">
                            {flexConfig.noShiftNotice || 'ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-neutral-100 rounded-lg text-[10px] text-neutral-600 leading-relaxed">
                      <strong>{flexConfig.timingPrefix || 'รายละเอียด:'}</strong>{' '}
                      {isSelectedDateHoliday
                        ? (flexConfig.weekend0755Desc || 'เวรวันหยุด เช้า OT (08:30 - 16:30 น.) บริหารจัดการคลังยา เอกสาร และเวชภัณฑ์')
                        : (flexConfig.weekday1555Desc || 'อีก 5 นาทีจะเริ่มเวลาปฏิบัติงานกะบ่าย (16:00 - 20:00 น.) ขอให้เข้าปฏิบัติงานและตรวจเช็คเอกสารยา')}
                    </div>

                    {flexConfig.showAdviceBox && flexConfig.adviceText && (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[10px] text-amber-900 leading-relaxed">
                        {flexConfig.adviceText}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Button */}
                  <div className="p-3 bg-neutral-50 border-t border-neutral-100 space-y-2">
                    <button
                      style={{ backgroundColor: flexConfig.button1Color || '#06C755' }}
                      className="w-full text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {flexConfig.button1Label || 'รับทราบตารางเวร'}
                    </button>

                    {flexConfig.showButton2 && (
                      <button className="w-full bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 py-1.5 rounded-lg font-semibold text-xs transition-colors">
                        {flexConfig.button2Label || 'ขอแลกเวร'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 space-y-4">
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                เลือกวันที่เพื่อดูตัวอย่างการ์ด
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {uniqueDates.map(date => {
                  const dayShifts = shifts.filter(s => s.date === date);
                  const isSelected = selectedDate === date;
                  const isHol = isWeekendOrHoliday(date);
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-neutral-800 border-white text-white'
                          : 'bg-[#18181B] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-neutral-200">
                          {date} {isHol ? '(วันหยุด/เสาร์-อาทิตย์)' : '(จันทร์-ศุกร์)'}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {dayShifts.map(s => s.staffName).join(', ')}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700">
                        {dayShifts.length} คน
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">ต้องการเปลี่ยนข้อความหรือสีในการ์ด?</div>
                  <div className="text-[11px] text-neutral-400">แก้ไขชื่อหน่วยงาน, กะเวร, ข้อความแนะนำ, และปุ่มกด</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubTab('flex-customizer')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  ปรับแต่งข้อความการ์ด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Staff & LINE User ID Directory */}
      {subTab === 'staff' && (
        <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
            STAFF ROSTER & DIRECTORY
          </div>
          <h3 className="text-sm font-bold text-white mb-2">
            รายชื่อเจ้าหน้าที่กลุ่มงานเภสัชกรรม รพ.สบปราบ
          </h3>
          <p className="text-xs text-neutral-400 mb-4">
            ข้อมูลรายชื่อเจ้าหน้าที่ทั้ง 4 ท่าน และ LINE User ID สำหรับการระบุตัวตนในระบบ
          </p>

          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-[#18181B] font-mono text-[11px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="p-3">ชื่อ - นามสกุล</th>
                  <th className="p-3">ตำแหน่ง / บทบาท</th>
                  <th className="p-3">เบอร์โทรศัพท์</th>
                  <th className="p-3">LINE User ID</th>
                  <th className="p-3 text-right">จำนวนเวรเดือนนี้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {shifts
                  .filter((s, idx, arr) => arr.findIndex(x => x.staffName === s.staffName) === idx)
                  .map(shift => {
                    const count = shifts.filter(s => s.staffName === shift.staffName).length;
                    return (
                      <tr key={shift.id} className="hover:bg-neutral-850">
                        <td className="p-3 font-semibold text-white">{shift.staffName}</td>
                        <td className="p-3 text-neutral-400">{shift.notes?.split('•')[0] || 'กลุ่มงานเภสัชกรรม'}</td>
                        <td className="p-3 font-mono text-neutral-300">{shift.phone || '08x-xxx-xxxx'}</td>
                        <td className="p-3 font-mono">
                          <input
                            type="text"
                            value={shift.lineUserId || ''}
                            onChange={e => {
                              const updated = shifts.map(s =>
                                s.staffName === shift.staffName ? { ...s, lineUserId: e.target.value } : s
                              );
                              onUpdateShifts(updated);
                            }}
                            placeholder="U1234567890..."
                            className="bg-[#18181B] border border-neutral-800 text-xs text-emerald-400 rounded px-2.5 py-1 w-64 focus:outline-none focus:border-neutral-500 font-mono"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-neutral-200">
                          {count} กะ
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Automation Script for 1 LINE Group */}
      {subTab === 'apps-script' && (
        <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                AUTOMATION SCRIPT (24/7 BACKGROUND TRIGGER FOR 1 LINE GROUP)
              </div>
              <h3 className="text-sm font-bold text-white">
                สคริปต์ส่งแจ้งเตือนอัตโนมัติเข้ากลุ่มไลน์ผ่าน Google Apps Script
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                รันอัตโนมัติบนคลาวด์ 24 ชม.: วันจันทร์-ศุกร์ ส่งเวลา 15:55 น. และ 20:00 น. / วันเสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์ ส่งเวลา 07:55 น.
              </p>
            </div>

            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors shrink-0"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScript ? 'คัดลอกเรียบร้อย' : 'คัดลอกโค้ดสคริปต์'}
            </button>
          </div>

          <div className="p-3 bg-[#18181B] rounded-lg border border-neutral-800 text-xs text-neutral-300 space-y-1">
            <div className="font-semibold text-white">ขั้นตอนติดตั้งใน Google Sheets:</div>
            <div>1. เปิด Google Sheet ตารางเวร รพ.สบปราบ เลือก <strong>Extensions (ส่วนขยาย) &gt; Apps Script</strong></div>
            <div>2. ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดด้านล่างนี้ (ระบบใส่ Token และ LINE Group ID ให้อัตโนมัติแล้ว)</div>
            <div>3. คลิกฟังก์ชัน <strong>setupAutoTriggers</strong> แล้วกดปุ่ม <strong>Run (เรียกใช้)</strong> เพื่อตั้งเวลาทำงานอัตโนมัติ 3 เวลาในระบบ Google</div>
          </div>

          <pre className="p-4 bg-[#09090B] rounded-lg border border-neutral-850 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-96 overflow-y-auto">
            {GOOGLE_APPS_SCRIPT_TEMPLATE.replace(
              'YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE',
              channelAccessToken || 'YOUR_CHANNEL_ACCESS_TOKEN'
            ).replace(
              'YOUR_LINE_GROUP_ID_HERE',
              lineGroupId || 'YOUR_LINE_GROUP_ID'
            )}
          </pre>
        </div>
      )}
    </div>
  );
};
