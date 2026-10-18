import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Table,
  Layers,
  Sparkles,
  Link as LinkIcon,
  HardDrive,
  Trash2,
  Send,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { DutyShift, NotificationLog } from '../types/roster';
import {
  loadDbConfig,
  saveDbConfig,
  fetchShiftsFromGoogleSheets,
  downloadShiftsCSV,
  syncShiftsToAppsScript,
  loadNotificationLogs,
  clearNotificationLogs,
  getAppsScriptTemplateCode,
  GoogleSheetsDbConfig,
} from '../services/googleSheetsDb';
import { HOSPITAL_INFO, getSampleRosterData } from '../data/mockRosters';
import confetti from 'canvas-confetti';

interface GoogleSheetsDbViewProps {
  shifts: DutyShift[];
  onUpdateShifts: (shifts: DutyShift[]) => void;
}

export const GoogleSheetsDbView: React.FC<GoogleSheetsDbViewProps> = ({
  shifts,
  onUpdateShifts,
}) => {
  const [dbConfig, setDbConfig] = useState<GoogleSheetsDbConfig>(loadDbConfig);
  const [sheetUrlInput, setSheetUrlInput] = useState(dbConfig.spreadsheetUrl);
  const [appsScriptInput, setAppsScriptInput] = useState(dbConfig.appsScriptUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAppsScriptSaving, setIsAppsScriptSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    setNotificationLogs(loadNotificationLogs());
  }, []);

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const result = await fetchShiftsFromGoogleSheets(sheetUrlInput);
      onUpdateShifts(result.shifts);
      const updatedConfig = saveDbConfig({
        spreadsheetUrl: sheetUrlInput,
        lastSyncTime: new Date().toISOString(),
        dbStatus: 'connected',
      });
      setDbConfig(updatedConfig);
      setStatusMessage(`ดึงข้อมูลจาก Google Sheets สำเร็จ! อัปเดต ${result.shifts.length} กะ`);
      confetti({ particleCount: 50, spread: 60 });
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToAppsScript = async () => {
    if (!appsScriptInput.trim()) {
      setErrorMessage('กรุณาระบุ URL ของ Google Apps Script Web App');
      return;
    }
    setIsAppsScriptSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await syncShiftsToAppsScript(appsScriptInput.trim(), shifts);
      const updated = saveDbConfig({ appsScriptUrl: appsScriptInput.trim() });
      setDbConfig(updated);
      setStatusMessage(`ส่งข้อมูลตารางเวร ${shifts.length} รายการไปยัง Google Sheets สำเร็จแล้ว!`);
      confetti({ particleCount: 60, spread: 50 });
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถบันทึกไปยัง Apps Script ได้');
    } finally {
      setIsAppsScriptSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    downloadShiftsCSV(shifts, `ตารางเวร_GoogleSheets_DB_${new Date().toISOString().slice(0, 10)}.csv`);
    setStatusMessage('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว สามารถนำเข้า Google Sheets ได้ทันที');
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getAppsScriptTemplateCode());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleClearLogs = () => {
    if (confirm('คุณต้องการล้างประวัติการแจ้งเตือนทั้งหมดหรือไม่?')) {
      clearNotificationLogs();
      setNotificationLogs([]);
      setStatusMessage('ล้างประวัติการแจ้งเตือนเรียบร้อยแล้ว');
    }
  };

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลตารางเวรกลับเป็นค่าเริ่มต้น รพ.สบปราบ 20 กะ หรือไม่?')) {
      const initial = getSampleRosterData();
      onUpdateShifts(initial);
      setStatusMessage('รีเซ็ตข้อมูลกลับสู่ตารางเวร รพ.สบปราบ 20 กะ เรียบร้อยแล้ว');
    }
  };

  // Metrics
  const morningCount = shifts.filter(s => s.shiftType === 'morning').length;
  const afternoonCount = shifts.filter(s => s.shiftType === 'afternoon').length;
  const uniqueStaff = Array.from(new Set(shifts.map(s => s.staffName)));

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Hero Card */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                DATABASE CENTER • ฐานข้อมูลหลัก
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Google Sheets Database
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                โหมดใช้งานคนเดียว (No Auth)
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-1">
              จัดการฐานข้อมูลตารางเวรด้วย Google Sheets
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              ระบบใช้ Google Sheets และหน่วยความจำเครื่อง (Local DB) เป็นฐานข้อมูลหลักโดยตรง ไม่ต้องผ่าน Firebase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors font-mono disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ดึงข้อมูลสดจาก Google Sheets'}
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 bg-[#18181B] hover:bg-neutral-800 text-neutral-200 border border-neutral-700 px-3.5 py-2 rounded-lg text-xs font-medium font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              ส่งออก CSV
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-neutral-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-neutral-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. Database Stats Overview */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        <div className="col-span-6 sm:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>จำนวนเวรในฐานข้อมูล</span>
            <Table className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {shifts.length} <span className="text-xs font-normal text-neutral-400">กะ</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
            100% พร้อมใช้งาน
          </div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>กะเช้า OT (08:30-16:30)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {morningCount} <span className="text-xs font-normal text-neutral-400">กะ</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            ห้องยา/คลังยา รพ.สบปราบ
          </div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>กะบ่าย 4 ชม. OT</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {afternoonCount} <span className="text-xs font-normal text-neutral-400">กะ</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            16:00 - 20:00 น.
          </div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-4">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>บุคลากรในตาราง</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {uniqueStaff.length} <span className="text-xs font-normal text-neutral-400">ท่าน</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            เชื่อมต่อ LINE ID แล้ว
          </div>
        </div>
      </div>

      {/* 3. Google Sheets Connection Configuration */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              การกำหนดค่า Google Spreadsheet Database
            </h3>
          </div>
          <a
            href={HOSPITAL_INFO.spreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-neutral-400 hover:text-white underline flex items-center gap-1"
          >
            เปิด Google Sheets ต้นฉบับ <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-neutral-300 font-mono flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-neutral-400" />
            ลิงก์หรือ Spreadsheet ID ของ Google Sheets ที่ต้องการใช้เป็นฐานข้อมูล:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={sheetUrlInput}
              onChange={e => setSheetUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="flex-1 bg-[#18181B] border border-neutral-800 text-neutral-100 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-neutral-500"
            />
            <button
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-mono font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              ทดสอบดึงข้อมูลชีต
            </button>
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            ID ปัจจุบัน: <span className="text-neutral-300">{dbConfig.spreadsheetId}</span>
            {dbConfig.lastSyncTime && (
              <span className="ml-3">
                ซิงค์ล่าสุด: {new Date(dbConfig.lastSyncTime).toLocaleTimeString('th-TH')}
              </span>
            )}
          </div>
        </div>

        {/* 2-Way Live Sync with Apps Script */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                <Code2 className="w-4 h-4 text-sky-400" />
                การเขียนข้อมูลกลับไปยัง Google Sheets แบบ 2 ทาง (2-Way Live Sync)
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                เลือกเชื่อมต่อผ่าน Google Apps Script Web App เพื่อบันทึกข้อมูลกะเวรกลับลงชีตได้โดยตรง ไม่ต้องล็อกอิน
              </p>
            </div>
            <button
              onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
              className="text-xs font-mono text-sky-400 hover:text-sky-300 underline flex items-center gap-1 self-start sm:self-auto"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showAppsScriptGuide ? 'ซ่อนคู่มือ Apps Script' : 'ดูวิธีติดตั้ง & โค้ด Apps Script'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={appsScriptInput}
              onChange={e => setAppsScriptInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec (URL ของ Web App ที่ Deploy)"
              className="flex-1 bg-[#18181B] border border-neutral-800 text-neutral-100 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-neutral-500"
            />
            <button
              onClick={handleSaveToAppsScript}
              disabled={isAppsScriptSaving}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-mono font-medium transition-colors disabled:opacity-50"
            >
              {isAppsScriptSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  กำลังส่งข้อมูล...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  บันทึกลง Google Sheets สด
                </>
              )}
            </button>
          </div>

          {/* Apps Script Guide Accordion */}
          {showAppsScriptGuide && (
            <div className="mt-3 p-4 bg-[#18181B] border border-neutral-700 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  ขั้นตอนติดตั้ง Google Apps Script สำหรับชีตของคุณ (3 นาที):
                </span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded text-xs font-mono transition-colors"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      คัดลอกเรียบร้อย!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-300" />
                      คัดลอกโค้ด Apps Script
                    </>
                  )}
                </button>
              </div>

              <ol className="text-xs text-neutral-300 space-y-1.5 list-decimal list-inside font-mono">
                <li>เปิด Google Sheets ตารางเวรของคุณในเบราว์เซอร์</li>
                <li>คลิกเมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
                <li>วางโค้ดที่คัดลอกลงในไฟล์ Code.gs ทั้งหมด</li>
                <li>คลิก <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
                <li>เลือกประเภท <strong>เว็บแอป (Web app)</strong> กำหนดสิทธิ์: <strong>ทุกคน (Anyone)</strong></li>
                <li>คัดลอก URL ของเว็บแอป นำมาวางในช่องด้านบน แล้วคลิก "บันทึกลง Google Sheets สด"</li>
              </ol>

              <pre className="p-3 bg-[#09090B] rounded border border-neutral-800 text-[10px] font-mono text-neutral-300 overflow-x-auto max-h-48">
                {getAppsScriptTemplateCode()}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 4. Notification History Logs (Replaces Firestore Logs) */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                ประวัติการแจ้งเตือน LINE OA (Local Database Log)
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              บันทึกประวัติการส่ง Flex Message และข้อความแจ้งเตือนอัตโนมัติในฐานข้อมูลเครื่อง
            </p>
          </div>

          {notificationLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-900/50 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ล้างประวัติ ({notificationLogs.length})
            </button>
          )}
        </div>

        {notificationLogs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-neutral-800 rounded-lg">
            <Send className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
            <div className="text-xs font-mono text-neutral-400">ยังไม่มีประวัติการส่งแจ้งเตือนในระบบ</div>
            <p className="text-[11px] text-neutral-500 mt-1">
              เมื่อมีการกดส่งแจ้งเตือนในแท็บ "แจ้งเตือน LINE OA" รายการจะถูกบันทึกที่นี่โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80 border border-neutral-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            {notificationLogs.map(log => (
              <div
                key={log.id}
                className="p-3 bg-[#18181B]/50 hover:bg-[#18181B] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{log.staffName}</div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      {log.shiftName} • {log.shiftDate}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px]">
                  <div className="text-neutral-400">
                    {new Date(log.timestamp).toLocaleTimeString('th-TH')}
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      log.status === 'success'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : 'text-rose-400 bg-rose-950/60'
                    }`}
                  >
                    {log.status === 'success' ? 'ส่งสำเร็จ' : 'ส่งไม่สำเร็จ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Database Maintenance & Reset */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
        <div>
          <span className="font-bold text-white">การบำรุงรักษาฐานข้อมูล:</span>
          <p className="text-neutral-400 text-[11px]">
            หากต้องการเริ่มรอบเดือนใหม่หรือกู้คืนข้อมูล สามารถรีเซ็ตเป็นตารางเวร รพ.สบปราบ 20 กะ ได้ทันที
          </p>
        </div>
        <button
          onClick={handleResetToDefault}
          className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg transition-colors border border-neutral-700 shrink-0"
        >
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          รีเซ็ตข้อมูลเริ่มต้น (รพ.สบปราบ 20 กะ)
        </button>
      </div>
    </div>
  );
};
