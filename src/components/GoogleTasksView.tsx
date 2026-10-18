import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DutyShift, GoogleTaskListItem, GoogleTaskItem } from '../types/roster';
import {
  listUserTaskLists,
  createTaskList,
  listTasksInList,
  createGoogleTask,
  toggleTaskComplete,
  deleteGoogleTask,
} from '../services/googleWorkspace';
import { downloadICalendarFile } from '../services/googleSheetsDb';
import confetti from 'canvas-confetti';

interface GoogleTasksViewProps {
  shifts: DutyShift[];
  token?: string | null;
  onRequireAuth?: () => void;
}

export const GoogleTasksView: React.FC<GoogleTasksViewProps> = ({
  shifts,
  token,
  onRequireAuth,
}) => {
  const [taskLists, setTaskLists] = useState<GoogleTaskListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [localCompletedMap, setLocalCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('duty_completed_tasks_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSyncingShifts, setIsSyncingShifts] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New list creation
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Delete confirmation modal (Workspace guidelines require explicit confirmation)
  const [taskToDelete, setTaskToDelete] = useState<GoogleTaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk sync confirmation modal
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false);

  useEffect(() => {
    if (token) {
      loadTaskLists();
    }
  }, [token]);

  useEffect(() => {
    if (selectedListId && token) {
      loadTasks(selectedListId);
    }
  }, [selectedListId, token]);

  const loadTaskLists = async () => {
    setIsLoadingLists(true);
    setError(null);
    try {
      const lists = await listUserTaskLists();
      setTaskLists(lists);
      if (lists.length > 0) {
        // Auto-select first list if none selected
        if (!selectedListId || !lists.some(l => l.id === selectedListId)) {
          setSelectedListId(lists[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายการ Google Tasks ได้');
    } finally {
      setIsLoadingLists(false);
    }
  };

  const loadTasks = async (listId: string) => {
    setIsLoadingTasks(true);
    setError(null);
    try {
      const fetchedTasks = await listTasksInList(listId);
      setTasks(fetchedTasks);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถดึงภารกิจในรายการนี้ได้');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      setIsLoadingLists(true);
      const created = await createTaskList(newListName.trim());
      setTaskLists(prev => [created, ...prev]);
      setSelectedListId(created.id);
      setNewListName('');
      setShowNewListModal(false);
      setSuccessMessage(`สร้างรายการงาน "${created.title}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้าง Task List ได้');
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleToggleTask = async (task: GoogleTaskItem) => {
    const newStatusIsComplete = task.status !== 'completed';
    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, status: newStatusIsComplete ? 'completed' : 'needsAction' }
          : t
      )
    );

    try {
      await toggleTaskComplete(selectedListId, task.id, newStatusIsComplete);
    } catch (err: any) {
      // Revert on error
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setError(err.message || 'ไม่สามารถอัปเดตสถานะงานได้');
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete || !selectedListId) return;

    setIsDeleting(true);
    try {
      await deleteGoogleTask(selectedListId, taskToDelete.id);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
      setSuccessMessage('ลบงานออกจาก Google Tasks เรียบร้อยแล้ว');
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบงานได้');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncAllShifts = async () => {
    setShowSyncConfirmModal(false);
    if (!selectedListId) {
      setError('กรุณาเลือกรายการงาน (Task List) ก่อนทำการซิงค์');
      return;
    }

    setIsSyncingShifts(true);
    setError(null);
    setSuccessMessage(null);
    setSyncProgress({ current: 0, total: shifts.length });

    let count = 0;
    try {
      for (const shift of shifts) {
        await createGoogleTask(selectedListId, shift);
        count++;
        setSyncProgress({ current: count, total: shifts.length });
      }

      await loadTasks(selectedListId);
      setSuccessMessage(`ซิงค์ตารางเวรเข้าสู่ Google Tasks สำเร็จแล้ว (${count} รายการ)`);
      confetti({ particleCount: 70, spread: 60 });
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการซิงค์ไปยัง Google Tasks');
    } finally {
      setIsSyncingShifts(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'needsAction';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const pendingCount = tasks.filter(t => t.status === 'needsAction').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  if (!token) {
    const localFilteredShifts = shifts.filter(s => {
      const isDone = Boolean(localCompletedMap[s.id]);
      if (filter === 'pending') return !isDone;
      if (filter === 'completed') return isDone;
      return true;
    });

    const localDoneCount = shifts.filter(s => localCompletedMap[s.id]).length;
    const localPendingCount = shifts.length - localDoneCount;

    const toggleLocalDone = (shiftId: string) => {
      const updated = { ...localCompletedMap, [shiftId]: !localCompletedMap[shiftId] };
      setLocalCompletedMap(updated);
      localStorage.setItem('duty_completed_tasks_map', JSON.stringify(updated));
      if (!localCompletedMap[shiftId]) {
        confetti({ particleCount: 30, spread: 40 });
      }
    };

    return (
      <div className="space-y-6">
        {/* Top Banner */}
        <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  DUTY TASKS & CHECKLIST
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  โหมดเดี่ยว (Single User Active)
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                รายการงานการอยู่เวรปฏิบัติการ (Interactive Tasks)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                ติดตามสถานะเวรปฏิบัติการ ติ๊กบันทึกงานที่เสร็จสิ้น และส่งออกปฏิทิน Google Calendar / iCalendar ได้ทันที
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => downloadICalendarFile(shifts)}
                className="flex items-center gap-2 bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors font-mono"
              >
                <Calendar className="w-3.5 h-3.5" />
                ส่งออก Google Calendar (.ics)
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-12 gap-3 mt-5 pt-4 border-t border-neutral-800/80">
            <div className="col-span-4 bg-[#18181B] p-3 rounded-lg border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400">ภารกิจทั้งหมด</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">{shifts.length} เวร</div>
            </div>
            <div className="col-span-4 bg-[#18181B] p-3 rounded-lg border border-neutral-800">
              <div className="text-[10px] font-mono text-amber-400">รอดำเนินการ</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{localPendingCount} เวร</div>
            </div>
            <div className="col-span-4 bg-[#18181B] p-3 rounded-lg border border-neutral-800">
              <div className="text-[10px] font-mono text-emerald-400">ปฏิบัติงานแล้ว</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{localDoneCount} เวร</div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-[#121214] border border-neutral-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'all' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              ทั้งหมด ({shifts.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'pending' ? 'bg-amber-950/60 text-amber-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              รอดำเนินการ ({localPendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'completed' ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              ปฏิบัติงานแล้ว ({localDoneCount})
            </button>
          </div>

          <div className="text-neutral-500 text-[11px]">
            คลิกที่ช่องหน้าภารกิจเพื่อเปลี่ยนสถานะ
          </div>
        </div>

        {/* Task List Items */}
        <div className="space-y-2">
          {localFilteredShifts.length === 0 ? (
            <div className="p-8 text-center bg-[#121214] border border-neutral-800 rounded-lg text-neutral-400 text-xs font-mono">
              ไม่พบภารกิจตามตัวกรองที่เลือก
            </div>
          ) : (
            localFilteredShifts.map(s => {
              const isDone = Boolean(localCompletedMap[s.id]);
              return (
                <div
                  key={s.id}
                  className={`bg-[#121214] border rounded-lg p-3.5 transition-all flex items-center justify-between gap-3 ${
                    isDone
                      ? 'border-neutral-800/60 opacity-60 bg-[#121214]/60'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleLocalDone(s.id)}
                      className="p-1 text-neutral-400 hover:text-white transition-colors shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-500" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${
                          isDone ? 'line-through text-neutral-400' : 'text-white'
                        }`}
                      >
                        เวร{s.shiftName} - {s.staffName}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          {s.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {s.startTime} - {s.endTime} น.
                        </span>
                        <span>•</span>
                        <span>{s.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                        `เวร${s.shiftName} - ${s.staffName}`
                      )}&dates=${s.date.replace(/-/g, '')}T${s.startTime.replace(':', '')}00/${s.date.replace(
                        /-/g,
                        ''
                      )}T${s.endTime.replace(':', '')}00&details=${encodeURIComponent(
                        `เจ้าหน้าที่: ${s.staffName}\nแผนก: ${s.department}\nหมายเหตุ: ${s.notes || ''}`
                      )}&location=${encodeURIComponent(s.location || 'ห้องยาและคลังยา รพ.สบปราบ')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      title="เพิ่มเวรนี้ลงใน Google Calendar ทันที"
                    >
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                      <span className="hidden sm:inline">Google Calendar</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                GOOGLE TASKS INTEGRATION
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                API เชื่อมต่อแล้ว
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              จัดการรายการงาน Google Tasks
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              สร้าง ตรวจสอบ และซิงค์งานเวรปฏิบัติการเข้าสู่ระบบ Google Tasks ของคุณโดยอัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNewListModal(true)}
              className="flex items-center gap-1.5 bg-[#18181B] hover:bg-neutral-800 text-neutral-200 border border-neutral-700 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>สร้างรายการงานใหม่</span>
            </button>

            <button
              onClick={() => setShowSyncConfirmModal(true)}
              disabled={isSyncingShifts || shifts.length === 0}
              className="flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 font-semibold px-4 py-2 rounded-lg text-xs font-mono transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ซิงค์ {shifts.length} กะเวรเข้า Tasks</span>
            </button>

            <a
              href="https://tasks.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 bg-[#18181B] hover:text-white text-neutral-400 border border-neutral-800 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
            >
              <span>เปิด Tasks</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Task List Selector Tabs */}
        <div className="mt-6 pt-5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">เลือกรายการ (List):</span>
            <select
              value={selectedListId}
              onChange={e => setSelectedListId(e.target.value)}
              className="bg-[#18181B] border border-neutral-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-white"
            >
              {taskLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedListId) loadTasks(selectedListId);
              }}
              disabled={isLoadingTasks}
              className="p-1.5 rounded-lg bg-[#18181B] text-neutral-400 hover:text-white border border-neutral-800"
              title="รีเฟรชงาน"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-[#18181B] text-neutral-400 hover:text-white'
              }`}
            >
              ทั้งหมด ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-[#18181B] text-neutral-400 hover:text-white'
              }`}
            >
              รอดำเนินการ ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'bg-[#18181B] text-neutral-400 hover:text-white'
              }`}
            >
              เสร็จสิ้นแล้ว ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Syncing Progress Alert */}
      {isSyncingShifts && (
        <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-700 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              กำลังนำเข้าตารางเวรไปยัง Google Tasks...
            </span>
            <span className="text-white font-bold">
              {syncProgress.current} / {syncProgress.total}
            </span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-white h-1.5 transition-all duration-200"
              style={{
                width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-neutral-400 hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-neutral-400 hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#18181B]">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            TASKS IN CURRENT LIST ({filteredTasks.length})
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            คลิกที่ช่องสี่เหลี่ยมเพื่อเปลี่ยนสถานะงาน
          </span>
        </div>

        {isLoadingTasks ? (
          <div className="p-12 text-center text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            กำลังโหลดข้อมูลงานจาก Google Tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 font-mono text-xs space-y-2">
            <div>ยังไม่มีรายการงานในหมวดนี้</div>
            <p className="text-[11px] text-neutral-600">
              กดปุ่ม "ซิงค์ {shifts.length} กะเวรเข้า Tasks" ด้านบนเพื่อนำตารางเวรเข้ามาใน Google Tasks
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {filteredTasks.map(task => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-neutral-800/30 ${
                    isDone ? 'opacity-60 bg-neutral-900/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-neutral-400 hover:text-white transition-colors"
                      title={isDone ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-500 hover:text-neutral-300" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isDone ? 'line-through text-neutral-400' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </div>

                      {task.notes && (
                        <div className="text-xs text-neutral-400 whitespace-pre-line font-mono bg-[#18181B] p-2.5 rounded border border-neutral-800 mt-1.5">
                          {task.notes}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-neutral-500 pt-1">
                        {task.due && (
                          <span className="flex items-center gap-1 text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            กำหนดส่ง: {task.due.split('T')[0]}
                          </span>
                        )}
                        {task.completed && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Clock className="w-3 h-3" />
                            เสร็จเมื่อ: {new Date(task.completed).toLocaleDateString('th-TH')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setTaskToDelete(task)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800 transition-colors shrink-0"
                    title="ลบงานนี้ (จะมีหน้าต่างยืนยัน)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create New Task List */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121214] border border-neutral-800 rounded-lg w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              สร้างรายการงานใหม่ (New Task List)
            </h3>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 font-mono block mb-1">
                  ชื่อรายการงาน:
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="เช่น ตารางเวร ต.ค. 2569"
                  autoFocus
                  className="w-full bg-[#18181B] border border-neutral-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-neutral-400 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim() || isLoadingLists}
                  className="bg-white text-black font-semibold px-4 py-2 rounded-lg text-xs font-mono hover:bg-neutral-200 disabled:opacity-50"
                >
                  สร้างรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Explicit Confirmation for Deleting a Task (MANDATORY per Workspace guidelines) */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121214] border border-neutral-800 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  ยืนยันการลบรายการใน Google Tasks
                </h3>
                <p className="text-xs text-neutral-300 mt-1">
                  คุณแน่ใจหรือไม่ว่าต้องการลบงาน:
                </p>
                <div className="text-xs text-white font-semibold font-mono bg-[#18181B] p-2 rounded mt-2 border border-neutral-800">
                  {taskToDelete.title}
                </div>
                <p className="text-[11px] text-neutral-500 mt-2">
                  การกระทำนี้จะลบงานออกจากระบบ Google Tasks ของคุณโดยตรง
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-mono text-neutral-400 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Explicit Confirmation for Bulk Syncing Shifts to Google Tasks */}
      {showSyncConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121214] border border-neutral-800 rounded-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center shrink-0 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  ยืนยันการนำเข้าตารางเวร ({shifts.length} รายการ)
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  ระบบจะทำการสร้างงานใหม่ใน Google Tasks สำหรับกะเวรทั้งหมดจำนวน{' '}
                  <strong className="text-white underline">{shifts.length} กะ</strong> พร้อมระบุชื่อเจ้าหน้าที่ วันที่ และกำหนดส่ง (Due Date) ไปยังรายการ:{' '}
                  <span className="text-white font-semibold">
                    {taskLists.find(l => l.id === selectedListId)?.title || 'รายการที่เลือก'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowSyncConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-neutral-400 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSyncAllShifts}
                className="bg-white text-black hover:bg-neutral-200 font-semibold px-5 py-2 rounded-lg text-xs font-mono transition-colors"
              >
                เริ่มซิงค์เข้า Google Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
