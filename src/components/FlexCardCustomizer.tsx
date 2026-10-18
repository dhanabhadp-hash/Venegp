import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Eye,
  Copy,
  Check,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Palette,
  MessageSquare,
  FileCode,
  Tag,
  Building2,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';
import { DutyShift, FlexCardConfig, DEFAULT_FLEX_CARD_CONFIG } from '../types/roster';
import {
  buildGroupRosterFlexMessage,
  buildDutyFlexMessage,
  FLEX_CARD_PRESETS,
  sendLinePushMessage,
  sendLineBroadcastMessage,
} from '../services/lineApi';
import confetti from 'canvas-confetti';

interface FlexCardCustomizerProps {
  config: FlexCardConfig;
  onChangeConfig: (config: FlexCardConfig) => void;
  sampleShifts: DutyShift[];
  channelAccessToken: string;
  lineGroupId: string;
  testUserId: string;
  targetMode: 'group' | 'broadcast' | 'user';
  onSaveToCloud?: () => Promise<void>;
}

export const FlexCardCustomizer: React.FC<FlexCardCustomizerProps> = ({
  config,
  onChangeConfig,
  sampleShifts,
  channelAccessToken,
  lineGroupId,
  testUserId,
  targetMode,
  onSaveToCloud,
}) => {
  const [activeSection, setActiveSection] = useState<'header' | 'body' | 'buttons' | 'slots'>('header');
  const [previewMode, setPreviewMode] = useState<'group' | 'individual'>('group');
  const [copiedJson, setCopiedJson] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sample date and shift for live rendering
  const sampleDate = '2026-10-16';
  const shiftsOnDate = sampleShifts.filter(s => s.date === sampleDate);
  const singleShift = sampleShifts[0] || {
    id: 'sample-1',
    date: sampleDate,
    staffName: 'นางปริยากร หล้าภู',
    shiftType: 'afternoon',
    shiftName: 'บ่าย 4 ชม. OT (เอกสาร)',
    startTime: '16:00',
    endTime: '20:00',
    department: config.hospitalName,
    notes: 'งานเอกสารและจ่ายยา OT',
    location: 'ห้องยาและคลังยา',
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = FLEX_CARD_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onChangeConfig({ ...config, ...preset.config });
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อความ Flex card กลับเป็นค่าเริ่มต้นทั้งหมดหรือไม่?')) {
      onChangeConfig({ ...DEFAULT_FLEX_CARD_CONFIG });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('duty_flex_card_config', JSON.stringify(config));
      if (onSaveToCloud) {
        await onSaveToCloud();
      }
      setSaveSuccess(true);
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate current JSON Flex message for group
  const generatedFlexMessage =
    previewMode === 'group'
      ? buildGroupRosterFlexMessage(
          shiftsOnDate.length > 0 ? shiftsOnDate : [singleShift],
          sampleDate,
          config.weekday1555Title,
          config.weekday1555Desc,
          config
        )
      : buildDutyFlexMessage(singleShift, config.defaultTitle, config);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(generatedFlexMessage, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleSendTestToLine = async () => {
    setIsSendingTest(true);
    setTestResult(null);

    const token = channelAccessToken.trim();
    if (!token) {
      setTestResult({
        success: false,
        message: 'กรุณากรอก LINE Channel Access Token ก่อนทดสอบส่งจริง หรือตั้งค่าใน Secrets',
      });
      setIsSendingTest(false);
      return;
    }

    try {
      let res: { success: boolean; data?: any; error?: string };
      if (targetMode === 'broadcast') {
        res = await sendLineBroadcastMessage(token, [generatedFlexMessage]);
      } else {
        const dest = targetMode === 'group' ? lineGroupId : testUserId;
        res = await sendLinePushMessage(token, dest, [generatedFlexMessage]);
      }

      if (res.success) {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        setTestResult({
          success: true,
          message: `ส่งการ์ด Flex Message ที่ปรับแต่งแล้วเข้า LINE สำเร็จเรียบร้อย!`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'ส่งไม่สำเร็จ กรุณาตรวจสอบข้อมูล',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'ส่งข้อความไม่สำเร็จ',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Presets */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                FLEX CARD TEXT & DESIGN CUSTOMIZER
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              ปรับแต่งข้อความและรูปแบบการ์ดแจ้งเตือนในกลุ่ม LINE
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              กำหนดข้อความหัวการ์ด, ชื่อหน่วยงาน, รายชื่อกะ, ข้อความแนะนำ, และปุ่มกดตอบกลับรับทราบเวรได้ตามต้องการ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              คืนค่าเริ่มต้น
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedJson ? 'คัดลอก JSON แล้ว' : 'คัดลอก JSON Flex'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saveSuccess ? 'บันทึกสำเร็จ' : isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </div>

        {/* Preset Cards */}
        <div className="mt-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
            เลือกแม่แบบสำเร็จรูป (Presets):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FLEX_CARD_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className="p-3 rounded-lg border border-neutral-800 bg-[#18181B] hover:border-neutral-600 text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors">
                    {preset.name}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-neutral-500 group-hover:text-emerald-400" />
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Customization Form on Left, Live Phone Mockup on Right */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {/* Section Navigation Tabs */}
          <div className="flex border-b border-neutral-800 space-x-1 font-mono text-xs overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSection('header')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeSection === 'header'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>1. ส่วนหัวการ์ด (Header)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('body')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeSection === 'body'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>2. เนื้อหา & ข้อความกะ (Body)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('buttons')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeSection === 'buttons'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>3. ปุ่มกดตอบกลับ (Actions)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('slots')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeSection === 'slots'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>4. ข้อความ 3 ช่วงเวลา</span>
            </button>
          </div>

          {/* Tab 1: Header */}
          {activeSection === 'header' && (
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                HEADER CUSTOMIZATION
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  ชื่อโรงพยาบาล / หน่วยงาน (Hospital or Department Name)
                </label>
                <input
                  type="text"
                  value={config.hospitalName}
                  onChange={e => onChangeConfig({ ...config, hospitalName: e.target.value })}
                  placeholder="เช่น รพ.สบปราบ • เภสัชกรรม"
                  className="w-full bg-[#18181B] border border-neutral-750 text-white rounded-lg px-3.5 py-2 text-xs font-sans placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  จะปรากฏเป็นข้อความสีเขียวบนสุดด้านซ้ายของการ์ด
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  ป้ายแท็กบนขวา (Badge Tag)
                </label>
                <input
                  type="text"
                  value={config.badgeText}
                  onChange={e => onChangeConfig({ ...config, badgeText: e.target.value })}
                  placeholder="เช่น GROUP BROADCAST หรือ DUTY NOTIFIER"
                  className="w-full bg-[#18181B] border border-neutral-750 text-white rounded-lg px-3.5 py-2 text-xs font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  หัวข้อหลักของการ์ด (Card Title)
                </label>
                <input
                  type="text"
                  value={config.defaultTitle}
                  onChange={e => onChangeConfig({ ...config, defaultTitle: e.target.value })}
                  placeholder="เช่น 📢 แจ้งเตือนการปฏิบัติงานอยู่เวร"
                  className="w-full bg-[#18181B] border border-neutral-750 text-white rounded-lg px-3.5 py-2 text-xs font-sans placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                    สีพื้นหลังส่วนหัว (Header Background)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.headerBgColor}
                      onChange={e => onChangeConfig({ ...config, headerBgColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border border-neutral-700"
                    />
                    <input
                      type="text"
                      value={config.headerBgColor}
                      onChange={e => onChangeConfig({ ...config, headerBgColor: e.target.value })}
                      className="flex-1 bg-[#18181B] border border-neutral-750 text-neutral-300 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                    สีตัวอักษรชื่อหน่วยงาน (Accent Color)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.headerTextColor}
                      onChange={e => onChangeConfig({ ...config, headerTextColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border border-neutral-700"
                    />
                    <input
                      type="text"
                      value={config.headerTextColor}
                      onChange={e => onChangeConfig({ ...config, headerTextColor: e.target.value })}
                      className="flex-1 bg-[#18181B] border border-neutral-750 text-neutral-300 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Body & Shift Labels */}
          {activeSection === 'body' && (
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                BODY LABELS & SHIFT NAMES
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                    ป้ายกำกับวันที่ (Date Label)
                  </label>
                  <input
                    type="text"
                    value={config.dateLabel}
                    onChange={e => onChangeConfig({ ...config, dateLabel: e.target.value })}
                    placeholder="เช่น 📅 ประจำวันที่:"
                    className="w-full bg-[#18181B] border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                    ป้ายหัวข้อรายชื่อเจ้าหน้าที่ (Staff Section Title)
                  </label>
                  <input
                    type="text"
                    value={config.staffSectionTitle}
                    onChange={e => onChangeConfig({ ...config, staffSectionTitle: e.target.value })}
                    placeholder="เช่น 👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน:"
                    className="w-full bg-[#18181B] border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  ชื่อเรียกกะเช้า OT (Morning Shift Label)
                </label>
                <input
                  type="text"
                  value={config.morningShiftLabel}
                  onChange={e => onChangeConfig({ ...config, morningShiftLabel: e.target.value })}
                  placeholder="เช่น 🌅 กะเช้า OT (08:30 - 16:30 น.)"
                  className="w-full bg-[#18181B] border border-neutral-750 text-emerald-400 font-medium rounded-lg px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  ชื่อเรียกกะบ่าย 4 ชม. OT (Afternoon Shift Label)
                </label>
                <input
                  type="text"
                  value={config.afternoonShiftLabel}
                  onChange={e => onChangeConfig({ ...config, afternoonShiftLabel: e.target.value })}
                  placeholder="เช่น 🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)"
                  className="w-full bg-[#18181B] border border-neutral-750 text-amber-400 font-medium rounded-lg px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  ข้อความกรณีไม่มีเจ้าหน้าที่อยู่เวร (No Shifts Notice)
                </label>
                <input
                  type="text"
                  value={config.noShiftNotice}
                  onChange={e => onChangeConfig({ ...config, noShiftNotice: e.target.value })}
                  placeholder="เช่น ไม่มีเจ้าหน้าที่อยู่เวรในวันนี้"
                  className="w-full bg-[#18181B] border border-neutral-750 text-neutral-300 rounded-lg px-3.5 py-2 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-200">
                    แสดงกล่องข้อความแนะนำท้ายการ์ด (Advice / Policy Note Box)
                  </label>
                  <input
                    type="checkbox"
                    checked={config.showAdviceBox}
                    onChange={e => onChangeConfig({ ...config, showAdviceBox: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </div>
                {config.showAdviceBox && (
                  <textarea
                    rows={2}
                    value={config.adviceText}
                    onChange={e => onChangeConfig({ ...config, adviceText: e.target.value })}
                    placeholder="เช่น 💡 ข้อแนะนำ: หากติดภารกิจต้องการแลกเวร กรุณาแจ้งหัวหน้าเวรล่วงหน้าอย่างน้อย 24 ชั่วโมง"
                    className="w-full bg-[#18181B] border border-neutral-750 text-white rounded-lg px-3.5 py-2 text-xs leading-relaxed focus:outline-none focus:border-neutral-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Action Buttons */}
          {activeSection === 'buttons' && (
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                BUTTON ACTIONS & AUTO-REPLY MESSAGES
              </div>
              <p className="text-xs text-neutral-400">
                เมื่อสมาชิกในกลุ่มกดปุ่ม ระบบ LINE จะส่งข้อความตอบกลับเข้าห้องแชทโดยอัตโนมัติ เพื่อยืนยันการรับทราบเวร
              </p>

              {/* Button 1 */}
              <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ปุ่มที่ 1: ยืนยันรับทราบเวร (Primary Button)
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">ปุ่มหลัก (จำเป็น)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-semibold text-neutral-300">
                        ข้อความบนปุ่ม (Button Label)
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {config.button1Label.length}/20 อักษร
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={20}
                      value={config.button1Label}
                      onChange={e => onChangeConfig({ ...config, button1Label: e.target.value })}
                      placeholder="เช่น รับทราบตารางเวร"
                      className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      สีของปุ่ม (Button Color)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.button1Color}
                        onChange={e => onChangeConfig({ ...config, button1Color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border border-neutral-700"
                      />
                      <input
                        type="text"
                        value={config.button1Color}
                        onChange={e => onChangeConfig({ ...config, button1Color: e.target.value })}
                        className="flex-1 bg-[#121214] border border-neutral-750 text-neutral-300 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    ข้อความตอบกลับอัตโนมัติเมื่อกด (Auto-reply Message Text)
                  </label>
                  <input
                    type="text"
                    value={config.button1Text}
                    onChange={e => onChangeConfig({ ...config, button1Text: e.target.value })}
                    placeholder="เช่น รับทราบตารางเวรประจำวันเรียบร้อยครับ/ค่ะ"
                    className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Button 2 */}
              <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    ปุ่มที่ 2: ขอแลกเวร / ติดภารกิจ (Secondary Button)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400">เปิดใช้งาน:</span>
                    <input
                      type="checkbox"
                      checked={config.showButton2}
                      onChange={e => onChangeConfig({ ...config, showButton2: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {config.showButton2 && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold text-neutral-300">
                          ข้อความบนปุ่ม (Button Label)
                        </label>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {config.button2Label.length}/20 อักษร
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={20}
                        value={config.button2Label}
                        onChange={e => onChangeConfig({ ...config, button2Label: e.target.value })}
                        placeholder="เช่น ขอแลกเวร"
                        className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        ข้อความตอบกลับอัตโนมัติเมื่อกด (Auto-reply Message Text)
                      </label>
                      <input
                        type="text"
                        value={config.button2Text}
                        onChange={e => onChangeConfig({ ...config, button2Text: e.target.value })}
                        placeholder="เช่น ขอแจ้งแลกเวร ติดภารกิจด่วน"
                        className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: 3-Slot Timings */}
          {activeSection === 'slots' && (
            <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                3 NOTIFICATION SLOTS TEXT TEMPLATES
              </div>
              <p className="text-xs text-neutral-400">
                ปรับแต่งข้อความและรายละเอียดที่จะแสดงในการแจ้งเตือนแต่ละรอบเวลา
              </p>

              {/* Slot 1: Weekday 15:55 */}
              <div className="p-3.5 rounded-lg bg-[#18181B] border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    1. วันจันทร์ - ศุกร์ เวลา 15:55 น. (กะบ่าย ครั้งที่ 1)
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">หัวเรื่องการ์ด:</label>
                  <input
                    type="text"
                    value={config.weekday1555Title}
                    onChange={e => onChangeConfig({ ...config, weekday1555Title: e.target.value })}
                    className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">ข้อความรายละเอียด:</label>
                  <textarea
                    rows={2}
                    value={config.weekday1555Desc}
                    onChange={e => onChangeConfig({ ...config, weekday1555Desc: e.target.value })}
                    className="w-full bg-[#121214] border border-neutral-750 text-neutral-300 rounded px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Slot 2: Weekday 20:00 */}
              <div className="p-3.5 rounded-lg bg-[#18181B] border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 font-mono">
                    2. วันจันทร์ - ศุกร์ เวลา 20:00 น. (ปิดกะบ่าย ครั้งที่ 2)
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">หัวเรื่องการ์ด:</label>
                  <input
                    type="text"
                    value={config.weekday2000Title}
                    onChange={e => onChangeConfig({ ...config, weekday2000Title: e.target.value })}
                    className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">ข้อความรายละเอียด:</label>
                  <textarea
                    rows={2}
                    value={config.weekday2000Desc}
                    onChange={e => onChangeConfig({ ...config, weekday2000Desc: e.target.value })}
                    className="w-full bg-[#121214] border border-neutral-750 text-neutral-300 rounded px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Slot 3: Weekend 07:55 */}
              <div className="p-3.5 rounded-lg bg-[#18181B] border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    3. วันเสาร์ - อาทิตย์ / นักขัตฤกษ์ เวลา 07:55 น. (กะเช้า OT)
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">หัวเรื่องการ์ด:</label>
                  <input
                    type="text"
                    value={config.weekend0755Title}
                    onChange={e => onChangeConfig({ ...config, weekend0755Title: e.target.value })}
                    className="w-full bg-[#121214] border border-neutral-750 text-white rounded px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">ข้อความรายละเอียด:</label>
                  <textarea
                    rows={2}
                    value={config.weekend0755Desc}
                    onChange={e => onChangeConfig({ ...config, weekend0755Desc: e.target.value })}
                    className="w-full bg-[#121214] border border-neutral-750 text-neutral-300 rounded px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test Dispatch with Customized Flex Card */}
          <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  ทดสอบส่ง Flex Card ที่ปรับแต่งนี้เข้า LINE ทันที
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  ส่งไปยัง: {targetMode === 'group' ? `กลุ่มไลน์ (${lineGroupId || 'ยังไม่ระบุ'})` : targetMode === 'broadcast' ? 'Broadcast' : `User (${testUserId})`}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestToLine}
                disabled={isSendingTest}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTest ? 'กำลังส่งเข้า LINE...' : 'ยิงทดสอบการ์ดจริง'}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200'
                    : 'bg-red-950/40 border border-red-800/60 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Phone Mockup Preview (5 cols) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[360px] space-y-3">
            {/* View Mode Toggle */}
            <div className="bg-[#18181B] border border-neutral-800 p-1 rounded-lg flex text-xs font-mono">
              <button
                type="button"
                onClick={() => setPreviewMode('group')}
                className={`flex-1 py-1.5 px-2 rounded transition-colors text-center font-medium ${
                  previewMode === 'group'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                การ์ดสรุปกลุ่ม (Group)
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('individual')}
                className={`flex-1 py-1.5 px-2 rounded transition-colors text-center font-medium ${
                  previewMode === 'individual'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                การ์ดรายบุคคล (Single)
              </button>
            </div>

            {/* Realistic Phone Bezel */}
            <div className="bg-[#000000] rounded-[40px] p-3 border-2 border-neutral-800 shadow-2xl">
              <div className="w-24 h-4 bg-neutral-900 rounded-full mx-auto mb-2" />

              {/* Chat Top Bar */}
              <div className="bg-[#18181B] text-white px-3 py-2 rounded-t-xl flex items-center justify-between border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white font-mono">
                    Rx
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-none truncate max-w-[170px]">
                      {config.hospitalName || 'กลุ่มเวรเภสัชกรรม'}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono mt-0.5">LINE Group Chat</div>
                  </div>
                </div>
                <Users className="w-3.5 h-3.5 text-neutral-400" />
              </div>

              {/* Chat Canvas */}
              <div className="bg-[#27272A] p-3 min-h-[490px] rounded-b-xl overflow-y-auto space-y-3 font-sans">
                {/* Bot Message Header */}
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 font-mono">
                  <span className="font-bold text-white">Duty Bot</span>
                  <span className="bg-emerald-500/20 text-emerald-400 px-1 rounded text-[8px]">BOT</span>
                  <span className="text-neutral-500">15:55 น.</span>
                </div>

                {/* THE LIVE FLEX CARD */}
                <div className="bg-white rounded-xl overflow-hidden shadow-xl text-neutral-900 text-xs">
                  {/* Card Header */}
                  <div
                    style={{ backgroundColor: config.headerBgColor || '#18181B' }}
                    className="p-3.5 text-white transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        style={{ color: config.headerTextColor || '#10B981' }}
                        className="text-[10px] font-mono font-bold tracking-wider truncate max-w-[180px]"
                      >
                        {config.hospitalName || 'รพ.สบปราบ • เภสัชกรรม'}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 shrink-0">
                        {config.badgeText || 'GROUP BROADCAST'}
                      </span>
                    </div>
                    <div className="text-sm font-bold mt-1 text-white leading-snug">
                      {previewMode === 'group'
                        ? config.weekday1555Title || config.defaultTitle
                        : config.defaultTitle}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-2.5">
                    {previewMode === 'group' ? (
                      <>
                        <div className="flex justify-between items-baseline border-b border-neutral-100 pb-2">
                          <span className="text-[11px] text-neutral-500 font-medium">
                            {config.dateLabel || '📅 ประจำวันที่:'}
                          </span>
                          <span className="font-bold text-xs text-neutral-900 font-mono">
                            {sampleDate}
                          </span>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-neutral-700 mb-1.5">
                            {config.staffSectionTitle || '👥 รายชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน:'}
                          </div>

                          <div className="space-y-1.5">
                            <div className="p-2 rounded bg-neutral-50 border border-neutral-100 space-y-1">
                              <div className="text-[10px] font-bold text-amber-700">
                                {config.afternoonShiftLabel || '🌇 กะบ่าย 4 ชม. OT (16:00 - 20:00 น.)'}
                              </div>
                              <div className="font-bold text-neutral-900 text-xs">
                                • {singleShift.staffName}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-neutral-100 rounded-lg text-[10px] text-neutral-600 leading-relaxed">
                          <strong>{config.timingPrefix || 'รายละเอียด:'}</strong>{' '}
                          {config.weekday1555Desc || 'อีก 5 นาทีจะเริ่มเวลาปฏิบัติงานกะบ่าย'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-baseline border-b border-neutral-100 pb-2">
                          <span className="text-[11px] text-neutral-500 font-medium">ชื่อเจ้าหน้าที่:</span>
                          <span className="font-bold text-sm text-neutral-900 font-sans">
                            {singleShift.staffName}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-neutral-500 text-[11px]">{config.dateLabel || '📅 วันที่:'}</span>
                            <span className="font-bold text-sky-700 font-mono">{singleShift.date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500 text-[11px]">⏰ กะ / เวลา:</span>
                            <span className="font-bold text-amber-700">
                              {singleShift.shiftName} ({singleShift.startTime} - {singleShift.endTime} น.)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500 text-[11px]">🏢 แผนก:</span>
                            <span className="text-neutral-700">{config.hospitalName}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Advice note box */}
                    {config.showAdviceBox && config.adviceText && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-200/50 rounded-lg text-[10px] text-amber-900 leading-relaxed">
                        {config.adviceText}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Buttons */}
                  <div className="p-3 bg-neutral-50 border-t border-neutral-100 space-y-2">
                    <button
                      style={{ backgroundColor: config.button1Color || '#06C755' }}
                      className="w-full text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:opacity-90"
                      onClick={() => alert(`[จำลองกดปุ่ม 1]\nตอบกลับด้วยข้อความ:\n"${config.button1Text}"`)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {config.button1Label || 'รับทราบตารางเวร'}
                    </button>

                    {config.showButton2 && (
                      <button
                        className="w-full bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 py-1.5 rounded-lg font-semibold text-xs transition-colors"
                        onClick={() => alert(`[จำลองกดปุ่ม 2]\nตอบกลับด้วยข้อความ:\n"${config.button2Text}"`)}
                      >
                        {config.button2Label || 'ขอแลกเวร'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-center text-neutral-400 font-mono pt-1">
                  💡 คลิกที่ปุ่มในการ์ดเพื่อทดสอบดูข้อความตอบกลับอัตโนมัติ
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
