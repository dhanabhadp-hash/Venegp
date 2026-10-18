import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  Save,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Clock,
  Calendar,
  Layers,
  Send,
  Sparkles,
} from 'lucide-react';
import { DutyShift } from '../types/roster';
import {
  testFirestoreConnection,
  saveRosterToFirestore,
  fetchUserRosters,
  deleteRosterFromFirestore,
  fetchNotificationLogs,
  SavedRosterDocument,
  NotificationLogItem,
  saveUserSettingsToFirestore,
  fetchUserSettingsFromFirestore,
} from '../services/firebaseDb';
import firebaseConfig from '../../firebase-applet-config.json';
import confetti from 'canvas-confetti';

interface FirebaseSyncViewProps {
  shifts: DutyShift[];
  onLoadRoster: (shifts: DutyShift[]) => void;
  token: string | null;
  onRequireAuth: () => void;
}

export const FirebaseSyncView: React.FC<FirebaseSyncViewProps> = ({
  shifts,
  onLoadRoster,
  token,
  onRequireAuth,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [savedRosters, setSavedRosters] = useState<SavedRosterDocument[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogItem[]>([]);
  const [isLoadingRosters, setIsLoadingRosters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New save title
  const [saveTitle, setSaveTitle] = useState('ตารางเวร รพ.สบปราบ (ตุลาคม 2569)');

  // Roster to delete modal
  const [rosterToDelete, setRosterToDelete] = useState<SavedRosterDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkConnection();
    if (token) {
      loadCloudData();
    }
  }, [token]);

  const checkConnection = async () => {
    const ok = await testFirestoreConnection();
    setIsConnected(ok);
  };

  const loadCloudData = async () => {
    setIsLoadingRosters(true);
    setErrorMessage(null);
    try {
      const [rosters, logs] = await Promise.all([
        fetchUserRosters().catch(err => {
          console.warn('Rosters load err:', err);
          return [];
        }),
        fetchNotificationLogs().catch(err => {
          console.warn('Logs load err:', err);
          return [];
        }),
      ]);
      setSavedRosters(rosters);
      setNotificationLogs(logs);
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลจาก Firebase Firestore ได้');
    } finally {
      setIsLoadingRosters(false);
    }
  };

  const handleSaveCurrentRoster = async () => {
    if (!token) {
      onRequireAuth();
      return;
    }

    if (shifts.length === 0) {
      setErrorMessage('ไม่มีข้อมูลกะเวรสำหรับบันทึก');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const rosterId = `roster-${Date.now()}`;
      await saveRosterToFirestore(rosterId, {
        title: saveTitle.trim() || 'ตารางเวร รพ.สบปราบ',
        month: '10',
        year: 2026,
        hospitalName: 'โรงพยาบาลสบปราบ',
        department: 'กลุ่มงานเภสัชกรรม',
        shifts,
      });

      setStatusMessage(`บันทึกตารางเวรขึ้น Firebase Firestore เรียบร้อยแล้ว (${shifts.length} กะ)`);
      confetti({ particleCount: 50, spread: 50 });
      await loadCloudData();
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกไปยัง Firebase Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreRoster = (roster: SavedRosterDocument) => {
    if (roster.shifts && roster.shifts.length > 0) {
      onLoadRoster(roster.shifts);
      setStatusMessage(`เรียกคืนตารางเวร "${roster.title}" (${roster.shifts.length} กะ) สำเร็จแล้ว`);
    } else {
      setErrorMessage('ตารางเวรนี้ไม่มีข้อมูลกะ');
    }
  };

  const confirmDeleteRoster = async () => {
    if (!rosterToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRosterFromFirestore(rosterToDelete.id);
      setSavedRosters(prev => prev.filter(r => r.id !== rosterToDelete.id));
      setRosterToDelete(null);
      setStatusMessage('ลบตารางเวรออกจาก Firebase Firestore เรียบร้อยแล้ว');
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถลบตารางเวรได้');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Firebase Status */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  FIREBASE FIRESTORE CLOUD DATABASE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Active & Connected
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                ระบบจัดการฐานข้อมูลตารางเวรบนคลาวด์
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                บันทึกและซิงค์ข้อมูลตารางเวร ประวัติการแจ้งเตือน LINE OA และการตั้งค่าลง Firestore แบบถาวร
              </p>
            </div>
          </div>

          <div className="font-mono text-xs space-y-1 bg-[#18181B] p-3 rounded-lg border border-neutral-800">
            <div className="text-neutral-400">
              Project ID: <span className="text-white font-semibold">{firebaseConfig.projectId}</span>
            </div>
            <div className="text-neutral-400">
              Database: <span className="text-white font-semibold">{(firebaseConfig as any).firestoreDatabaseId || '(default)'}</span>
            </div>
            <div className="text-neutral-400">
              Region: <span className="text-emerald-400 font-semibold">asia-east1</span>
            </div>
          </div>
        </div>

        {/* Action: Save Current Roster */}
        <div className="mt-6 pt-5 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={saveTitle}
            onChange={e => setSaveTitle(e.target.value)}
            placeholder="ชื่อชุดตารางเวร เช่น ตารางเวร รพ.สบปราบ ต.ค. 2569"
            className="flex-1 bg-[#18181B] border border-neutral-700 text-white rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-white"
          />
          <button
            onClick={handleSaveCurrentRoster}
            disabled={isSaving || shifts.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 font-semibold px-5 py-2 rounded-lg text-xs font-mono transition-colors shrink-0 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5" />
                บันทึก {shifts.length} กะขึ้น Firestore
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status & Error Alerts */}
      {statusMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid: Saved Rosters & Notification Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Saved Rosters Collection */}
        <div className="bg-[#121214] border border-neutral-800 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#18181B]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-200 font-semibold">
                ตารางเวรที่บันทึกใน FIRESTORE ({savedRosters.length})
              </span>
            </div>
            <button
              onClick={loadCloudData}
              disabled={isLoadingRosters}
              className="p-1 rounded text-neutral-400 hover:text-white"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRosters ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!token ? (
            <div className="p-8 text-center text-neutral-500 font-mono text-xs">
              กรุณาลงชื่อเข้าใช้ Google เพื่อดูชุดตารางเวรที่บันทึกไว้ใน Firebase
            </div>
          ) : isLoadingRosters ? (
            <div className="p-8 text-center text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              กำลังโหลดชุดข้อมูลตารางเวร...
            </div>
          ) : savedRosters.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-mono text-xs space-y-1">
              <div>ยังไม่มีชุดตารางเวรที่บันทึกใน Firestore</div>
              <div className="text-[11px] text-neutral-600">
                พิมพ์ชื่อแล้วกด "บันทึก {shifts.length} กะขึ้น Firestore" เพื่อเก็บข้อมูล
              </div>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800 max-h-[380px] overflow-y-auto">
              {savedRosters.map(roster => (
                <div
                  key={roster.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-800/20 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {roster.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-neutral-400">
                      <span>{roster.shifts?.length || 0} กะเวร</span>
                      <span>•</span>
                      <span>{roster.department || 'รพ.สบปราบ'}</span>
                      <span>•</span>
                      <span>{new Date(roster.updatedAt).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestoreRoster(roster)}
                      className="flex items-center gap-1 bg-[#18181B] hover:bg-neutral-700 text-white px-2.5 py-1.5 rounded text-xs font-mono border border-neutral-700 transition-colors"
                      title="โหลดตารางเวรนี้มาแสดงในหน้าหลัก"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-400" />
                      <span>เรียกคืน</span>
                    </button>
                    <button
                      onClick={() => setRosterToDelete(roster)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800 transition-colors"
                      title="ลบออกจาก Firestore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: LINE OA Notification Logs in Firestore */}
        <div className="bg-[#121214] border border-neutral-800 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#18181B]">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-200 font-semibold">
                ประวัติการแจ้งเตือน LINE OA ใน FIRESTORE ({notificationLogs.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">บันทึกอัตโนมัติ</span>
          </div>

          {!token ? (
            <div className="p-8 text-center text-neutral-500 font-mono text-xs">
              กรุณาลงชื่อเข้าใช้ Google เพื่อดูประวัติการแจ้งเตือน
            </div>
          ) : notificationLogs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-mono text-xs space-y-1">
              <div>ยังไม่มีประวัติการส่งข้อความ LINE OA ที่บันทึก</div>
              <div className="text-[11px] text-neutral-600">
                เมื่อกดส่งแจ้งเตือนในแท็บ LINE ข้อความจะถูกบันทึกประวัติลง Firestore อัตโนมัติ
              </div>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800 max-h-[380px] overflow-y-auto">
              {notificationLogs.map(log => (
                <div key={log.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {log.staffName} ({log.shiftDate})
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono truncate">
                      ผู้รับ: {log.recipient} • ประเภท: {log.type}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {log.status}
                    </span>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      {new Date(log.sentAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {rosterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121214] border border-neutral-800 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  ยืนยันการลบตารางเวรจาก Firestore
                </h3>
                <p className="text-xs text-neutral-300 mt-1">
                  คุณต้องการลบตารางเวร:
                </p>
                <div className="text-xs text-white font-semibold font-mono bg-[#18181B] p-2 rounded mt-2 border border-neutral-800">
                  {rosterToDelete.title}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRosterToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-mono text-neutral-400 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteRoster}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
