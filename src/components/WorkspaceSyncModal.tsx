import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { DutyShift, GoogleCalendarItem, GoogleTaskListItem } from '../types/roster';
import {
  listUserCalendars,
  createCalendarDutyEvent,
  listUserTaskLists,
  createTaskList,
  createGoogleTask,
} from '../services/googleWorkspace';
import confetti from 'canvas-confetti';

interface WorkspaceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: DutyShift[];
  token: string | null;
  onRequireAuth: () => void;
  onSyncComplete?: () => void;
}

export const WorkspaceSyncModal: React.FC<WorkspaceSyncModalProps> = ({
  isOpen,
  onClose,
  shifts,
  token,
  onRequireAuth,
  onSyncComplete,
}) => {
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [syncToTasks, setSyncToTasks] = useState(true);

  // Calendars & TaskLists
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [taskLists, setTaskLists] = useState<GoogleTaskListItem[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');

  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: '',
  });
  const [syncResult, setSyncResult] = useState<{ success: boolean; calendarCount: number; tasksCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New task list name
  const [newListName, setNewListName] = useState('ตารางเข้าเวร (Duty Roster)');
  const [showCreateList, setShowCreateList] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      loadWorkspaceResources();
    }
  }, [isOpen, token]);

  const loadWorkspaceResources = async () => {
    setIsLoadingMeta(true);
    setError(null);
    try {
      const [cals, lists] = await Promise.all([
        listUserCalendars().catch(err => {
          console.warn('Calendar list err:', err);
          return [{ id: 'primary', summary: 'Primary Calendar (ปฏิทินหลัก)', primary: true }];
        }),
        listUserTaskLists().catch(err => {
          console.warn('Tasks list err:', err);
          return [];
        }),
      ]);

      setCalendars(cals);
      if (cals.length > 0) {
        const primaryCal = cals.find(c => c.primary) || cals[0];
        setSelectedCalendarId(primaryCal.id);
      }

      setTaskLists(lists);
      if (lists.length > 0) {
        setSelectedTaskListId(lists[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูล Google Workspace ได้');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleCreateNewTaskList = async () => {
    if (!newListName.trim()) return;
    try {
      setIsLoadingMeta(true);
      const created = await createTaskList(newListName.trim());
      setTaskLists(prev => [created, ...prev]);
      setSelectedTaskListId(created.id);
      setShowCreateList(false);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้าง Task List ใหม่ได้');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!token) {
      onRequireAuth();
      return;
    }

    if (!syncToCalendar && !syncToTasks) {
      setError('กรุณาเลือกอย่างน้อยหนึ่งบริการ (Google Calendar หรือ Google Tasks)');
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    let calSuccess = 0;
    let taskSuccess = 0;
    const totalOperations = (syncToCalendar ? shifts.length : 0) + (syncToTasks ? shifts.length : 0);
    let currentOp = 0;

    try {
      // 1. Google Calendar sync
      if (syncToCalendar) {
        for (const shift of shifts) {
          currentOp++;
          setSyncProgress({
            current: currentOp,
            total: totalOperations,
            message: `กำลังเพิ่มเข้า Google Calendar: ${shift.staffName} (${shift.date})...`,
          });
          try {
            await createCalendarDutyEvent(selectedCalendarId, shift);
            calSuccess++;
          } catch (err) {
            console.error('Calendar item err:', err);
          }
        }
      }

      // 2. Google Tasks sync
      if (syncToTasks) {
        let targetListId = selectedTaskListId;
        // If no task list exists, auto-create one
        if (!targetListId) {
          const defaultList = await createTaskList('ตารางเข้าเวร (Duty Roster)');
          targetListId = defaultList.id;
          setTaskLists(prev => [defaultList, ...prev]);
          setSelectedTaskListId(defaultList.id);
        }

        for (const shift of shifts) {
          currentOp++;
          setSyncProgress({
            current: currentOp,
            total: totalOperations,
            message: `กำลังเพิ่มเข้า Google Tasks: [อยู่เวร] ${shift.staffName}...`,
          });
          try {
            await createGoogleTask(targetListId, shift);
            taskSuccess++;
          } catch (err) {
            console.error('Task item err:', err);
          }
        }
      }

      setSyncResult({
        success: true,
        calendarCount: calSuccess,
        tasksCount: taskSuccess,
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดขณะซิงค์ข้อมูลไปยัง Google Workspace');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-mono">
      <div className="bg-[#121214] border border-neutral-800 rounded-lg w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                GOOGLE WORKSPACE INTEGRATION
              </div>
              <h3 className="text-sm font-bold text-white font-sans">
                ซิงค์ข้อมูลไปยัง Google Tasks & Calendar
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
          {/* Explicit User Confirmation Note (Workspace Guideline Mandate) */}
          <div className="p-3.5 rounded-lg bg-[#18181B] border border-neutral-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300">
              <span className="font-semibold text-white">การยืนยันสิทธิ์ความปลอดภัย: </span>
              แอปพลิเคชันจะดำเนินการสร้างกิจกรรมและงานใหม่จำนวน{' '}
              <strong className="text-white underline">{shifts.length} รายการ</strong> ในบัญชี Google Workspace ของคุณ (จะไม่มีการลบหรือเขียนทับข้อมูลเดิมที่มีอยู่)
            </div>
          </div>

          {!token ? (
            <div className="p-6 text-center bg-[#18181B] rounded-lg border border-neutral-800">
              <p className="text-xs text-neutral-300 mb-3">
                คุณยังไม่ได้เชื่อมต่อบัญชี Google Workspace
              </p>
              <button
                onClick={onRequireAuth}
                className="inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-lg text-xs hover:bg-neutral-200 transition-colors font-mono"
              >
                ลงชื่อเข้าใช้ Google เพื่อดำเนินการต่อ
              </button>
            </div>
          ) : (
            <>
              {/* Target Services Selection */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  SERVICES SELECTION:
                </label>

                {/* Google Calendar Option */}
                <div className={`p-3.5 rounded-lg border transition-colors ${syncToCalendar ? 'bg-[#18181B] border-white' : 'bg-[#141416] border-neutral-800'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToCalendar}
                        onChange={e => setSyncToCalendar(e.target.checked)}
                        className="rounded border-neutral-700 text-white focus:ring-0 w-4 h-4"
                      />
                      <CalendarIcon className="w-4 h-4 text-white" />
                      <span className="text-xs font-bold text-white font-mono">Google Calendar</span>
                    </label>
                    <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-0.5 rounded">
                      {shifts.length} events
                    </span>
                  </div>

                  {syncToCalendar && (
                    <div className="mt-2.5 pl-6 font-mono text-xs">
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        เลือกปฏิทินปลายทาง:
                      </label>
                      <select
                        value={selectedCalendarId}
                        onChange={e => setSelectedCalendarId(e.target.value)}
                        className="w-full bg-[#121214] border border-neutral-700 text-xs text-white rounded p-2 focus:outline-none focus:border-white"
                      >
                        {calendars.map(cal => (
                          <option key={cal.id} value={cal.id}>
                            {cal.summary} {cal.primary ? '(Primary)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Google Tasks Option */}
                <div className={`p-3.5 rounded-lg border transition-colors ${syncToTasks ? 'bg-[#18181B] border-white' : 'bg-[#141416] border-neutral-800'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToTasks}
                        onChange={e => setSyncToTasks(e.target.checked)}
                        className="rounded border-neutral-700 text-white focus:ring-0 w-4 h-4"
                      />
                      <CheckSquare className="w-4 h-4 text-white" />
                      <span className="text-xs font-bold text-white font-mono">Google Tasks</span>
                    </label>
                    <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-0.5 rounded">
                      {shifts.length} tasks
                    </span>
                  </div>

                  {syncToTasks && (
                    <div className="mt-2.5 pl-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-400">
                          เลือกรายการงาน (Task List):
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCreateList(!showCreateList)}
                          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <PlusCircle className="w-3 h-3" /> สร้างรายการใหม่
                        </button>
                      </div>

                      {showCreateList ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newListName}
                            onChange={e => setNewListName(e.target.value)}
                            placeholder="ชื่อรายการ เช่น ตารางเข้าเวร"
                            className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={handleCreateNewTaskList}
                            disabled={isLoadingMeta}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg"
                          >
                            สร้าง
                          </button>
                        </div>
                      ) : (
                        <select
                          value={selectedTaskListId}
                          onChange={e => setSelectedTaskListId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                        >
                          {taskLists.map(list => (
                            <option key={list.id} value={list.id}>
                              {list.title}
                            </option>
                          ))}
                          {taskLists.length === 0 && (
                            <option value="">(จะสร้างรายการ "ตารางเข้าเวร" ให้อัตโนมัติ)</option>
                          )}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar during sync */}
              {isSyncing && (
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                      {syncProgress.message}
                    </span>
                    <span className="font-mono text-sky-400">
                      {syncProgress.current} / {syncProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-emerald-400 h-2 transition-all duration-200"
                      style={{
                        width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Sync Result */}
              {syncResult && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200 space-y-1">
                    <div className="font-bold text-white text-sm">ซิงค์สำเร็จเรียบร้อย!</div>
                    <div>
                      • Google Calendar: สร้างกิจกรรมแล้ว {syncResult.calendarCount} รายการ
                    </div>
                    <div>
                      • Google Tasks: เพิ่มงานแล้ว {syncResult.tasksCount} รายการ
                    </div>
                    <div className="pt-1 flex gap-3">
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 underline inline-flex items-center gap-1"
                      >
                        เปิดดูใน Google Calendar <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href="https://tasks.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 underline inline-flex items-center gap-1"
                      >
                        เปิดดูใน Google Tasks <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            ปิด
          </button>

          {token && (
            <button
              type="button"
              onClick={handleExecuteSync}
              disabled={isSyncing || (!syncToCalendar && !syncToTasks)}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg active:scale-95 transition-all"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังซิงค์ข้อมูล...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  ยืนยันการเพิ่มข้อมูล ({shifts.length} รายการ)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
