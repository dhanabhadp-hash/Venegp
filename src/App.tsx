/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { SheetImporter } from './components/SheetImporter';
import { RosterAnalyzer } from './components/RosterAnalyzer';
import { WorkspaceSyncModal } from './components/WorkspaceSyncModal';
import { LineNotifier } from './components/LineNotifier';
import { DeskCalendarView } from './components/DeskCalendarView';
import { GoogleTasksView } from './components/GoogleTasksView';
import { FirebaseSyncView } from './components/FirebaseSyncView';
import { initAuth, googleSignIn, logout } from './services/googleAuth';
import { testFirestoreConnection, fetchUserSettingsFromFirestore, saveUserSettingsToFirestore } from './services/firebaseDb';
import { getSampleRosterData } from './data/mockRosters';
import { DutyShift } from './types/roster';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'roster' | 'tasks' | 'sync' | 'firebase' | 'line' | 'desk-calendar'>('roster');

  // Duty Roster Shifts
  const [shifts, setShifts] = useState<DutyShift[]>(() => {
    return getSampleRosterData();
  });

  // LINE OA Access Token
  const [channelAccessToken, setChannelAccessToken] = useState<string>(() => {
    return localStorage.getItem('duty_line_channel_token') || '';
  });

  // Target shift for single notification from table
  const [singleShiftToNotify, setSingleShiftToNotify] = useState<DutyShift | null>(null);

  // Workspace Sync Modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Test Firestore connection on boot per Firebase guidelines
  useEffect(() => {
    testFirestoreConnection().then(ok => {
      console.log('Firebase Firestore connection check:', ok ? 'CONNECTED (asia-east1)' : 'OFFLINE');
    });
  }, []);

  // Save LINE token to localStorage whenever changed and sync to Firestore if user logged in
  useEffect(() => {
    if (channelAccessToken) {
      localStorage.setItem('duty_line_channel_token', channelAccessToken);
      if (user) {
        saveUserSettingsToFirestore({ lineChannelToken: channelAccessToken }).catch(() => {});
      }
    }
  }, [channelAccessToken, user]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);

        // Fetch user settings from Firestore if available
        try {
          const settings = await fetchUserSettingsFromFirestore();
          if (settings?.lineChannelToken && !channelAccessToken) {
            setChannelAccessToken(settings.lineChannelToken);
          }
        } catch (e) {
          console.warn('Could not load user settings from Firestore:', e);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      alert(err.message || 'การลงชื่อเข้าใช้ Google ไม่สำเร็จ');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  const handleSingleNotificationTrigger = (shift: DutyShift) => {
    setSingleShiftToNotify(shift);
    setActiveTab('line');
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090B] text-[#F4F4F5] flex flex-col font-['Inter','Prompt',sans-serif]">
      {/* Top Navigation & Status Bar */}
      <Header
        user={user}
        token={token}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shiftsCount={shifts.length}
        lineConfigured={Boolean(channelAccessToken.trim())}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Google Sheets & Roster Analyzer */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <SheetImporter
              shifts={shifts}
              onRosterLoaded={newShifts => setShifts(newShifts)}
              token={token}
              onRequireAuth={handleLogin}
            />

            <RosterAnalyzer
              shifts={shifts}
              onUpdateShifts={setShifts}
              onSendSingleNotification={handleSingleNotificationTrigger}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: Interactive Google Tasks */}
        {activeTab === 'tasks' && (
          <GoogleTasksView
            shifts={shifts}
            token={token}
            onRequireAuth={handleLogin}
          />
        )}

        {/* Tab 3: Workspace Sync View */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="bg-[#121214] rounded-lg p-6 border border-neutral-800 shadow-sm">
              <div className="max-w-3xl">
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  GOOGLE WORKSPACE SYNCHRONIZATION
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                  ซิงค์ตารางเวรเข้าสู่ Google Tasks & Calendar
                </h2>
                <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                  นำข้อมูลคนอยู่เวร วันที่ และช่วงเวลากะที่วิเคราะห์ได้จาก Google Sheets ไปสร้างเป็นกิจกรรมบน Google Calendar ของคุณหรือของทีม พร้อมสร้างรายการแจ้งเตือนสิ่งที่ต้องทำใน Google Tasks โดยอัตโนมัติ
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold mb-1">
                      GOOGLE CALENDAR
                    </div>
                    <div className="text-xs text-white font-semibold">สร้างกิจกรรมเข้าเวรพร้อมเวลาเริ่ม-สิ้นสุด</div>
                    <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                      เช้า OT (08:30 - 16:30 น.) • บ่าย OT (16:00 - 20:00 น.)
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold mb-1">
                      GOOGLE TASKS
                    </div>
                    <div className="text-xs text-white font-semibold">สร้าง To-Do งานพร้อมกำหนดส่ง (Due Date)</div>
                    <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                      ระบุเจ้าหน้าที่ แผนก และงานเอกสาร/จ่ายยา OT
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsSyncModalOpen(true)}
                  className="bg-white text-black hover:bg-neutral-200 font-semibold px-5 py-2.5 rounded-lg text-xs tracking-wide transition-colors font-mono"
                >
                  เปิดหน้าต่างยืนยันการซิงค์ข้อมูล ({shifts.length} รายการ)
                </button>
              </div>
            </div>

            <RosterAnalyzer
              shifts={shifts}
              onUpdateShifts={setShifts}
              onSendSingleNotification={handleSingleNotificationTrigger}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 4: Firebase Firestore Cloud Persistence */}
        {activeTab === 'firebase' && (
          <FirebaseSyncView
            shifts={shifts}
            onLoadRoster={loadedShifts => setShifts(loadedShifts)}
            token={token}
            onRequireAuth={handleLogin}
          />
        )}

        {/* Tab 5: LINE OA Notifier */}
        {activeTab === 'line' && (
          <LineNotifier
            shifts={shifts}
            onUpdateShifts={setShifts}
            channelAccessToken={channelAccessToken}
            setChannelAccessToken={setChannelAccessToken}
            singleShiftToNotify={singleShiftToNotify}
            onClearSingleNotify={() => setSingleShiftToNotify(null)}
          />
        )}

        {/* Tab 6: Desk Calendar 3D View */}
        {activeTab === 'desk-calendar' && (
          <DeskCalendarView shifts={shifts} />
        )}
      </main>

      {/* Workspace Sync Modal */}
      <WorkspaceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        shifts={shifts}
        token={token}
        onRequireAuth={handleLogin}
      />
    </div>
  );
}
