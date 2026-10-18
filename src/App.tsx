/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, AppTab } from './components/Header';
import { SheetImporter } from './components/SheetImporter';
import { RosterAnalyzer } from './components/RosterAnalyzer';
import { WorkspaceSyncModal } from './components/WorkspaceSyncModal';
import { LineNotifier } from './components/LineNotifier';
import { DeskCalendarView } from './components/DeskCalendarView';
import { GoogleTasksView } from './components/GoogleTasksView';
import { GoogleSheetsDbView } from './components/GoogleSheetsDbView';
import {
  loadShiftsFromLocalStorage,
  saveShiftsToLocalStorage,
  fetchShiftsFromGoogleSheets,
  loadDbConfig,
  saveUserSettings,
  loadUserSettings,
} from './services/googleSheetsDb';
import { getSampleRosterData } from './data/mockRosters';
import { DutyShift } from './types/roster';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Active Tab: Roster, Tasks, Sync, Sheets DB (replaces Firebase), LINE, Desk Calendar
  const [activeTab, setActiveTab] = useState<AppTab>('roster');

  // Duty Roster Shifts loaded from local database cache or hospital default
  const [shifts, setShifts] = useState<DutyShift[]>(() => {
    const cached = loadShiftsFromLocalStorage();
    return cached.length > 0 ? cached : getSampleRosterData();
  });

  // LINE OA Access Token
  const [channelAccessToken, setChannelAccessToken] = useState<string>(() => {
    const saved = loadUserSettings();
    return saved.lineChannelToken || localStorage.getItem('duty_line_channel_token') || '';
  });

  // Target shift for single notification from table
  const [singleShiftToNotify, setSingleShiftToNotify] = useState<DutyShift | null>(null);

  // Workspace Sync Modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Auto-sync from Google Sheets database on boot if enabled
  useEffect(() => {
    const config = loadDbConfig();
    if (config.autoSyncOnOpen) {
      fetchShiftsFromGoogleSheets()
        .then(res => {
          if (res.shifts && res.shifts.length > 0) {
            setShifts(res.shifts);
            saveShiftsToLocalStorage(res.shifts);
            console.log(`Google Sheets Database connected: synced ${res.shifts.length} shifts`);
          }
        })
        .catch(err => {
          console.warn('Initial Google Sheets sync notice (using cached data):', err.message);
        });
    }
  }, []);

  // Save LINE token to localStorage whenever changed
  useEffect(() => {
    if (channelAccessToken) {
      localStorage.setItem('duty_line_channel_token', channelAccessToken);
      saveUserSettings({ lineChannelToken: channelAccessToken });
    }
  }, [channelAccessToken]);

  const handleUpdateShifts = (newShifts: DutyShift[]) => {
    setShifts(newShifts);
    saveShiftsToLocalStorage(newShifts);
  };

  const handleSingleNotificationTrigger = (shift: DutyShift) => {
    setSingleShiftToNotify(shift);
    setActiveTab('line');
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090B] text-[#F4F4F5] flex flex-col font-['Inter','Prompt',sans-serif]">
      {/* Mobile PWA Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* Top Navigation & Status Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shiftsCount={shifts.length}
        lineConfigured={Boolean(channelAccessToken.trim())}
      />

      {/* Offline Status Indicator Toast */}
      <OfflineIndicator />

      {/* Main Content Area with responsive padding for mobile bottom bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        {/* Tab 1: Google Sheets & Roster Analyzer */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <SheetImporter
              shifts={shifts}
              onRosterLoaded={handleUpdateShifts}
            />

            <RosterAnalyzer
              shifts={shifts}
              onUpdateShifts={handleUpdateShifts}
              onSendSingleNotification={handleSingleNotificationTrigger}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: Interactive Google Tasks (Single User Mode) */}
        {activeTab === 'tasks' && (
          <GoogleTasksView shifts={shifts} />
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
                  นำข้อมูลคนอยู่เวร วันที่ และช่วงเวลากะที่วิเคราะห์ได้จากฐานข้อมูล Google Sheets ไปสร้างเป็นกิจกรรมบน Google Calendar ของคุณหรือของทีม พร้อมสร้างรายการแจ้งเตือนสิ่งที่ต้องทำใน Google Tasks ได้ทันที
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
              onUpdateShifts={handleUpdateShifts}
              onSendSingleNotification={handleSingleNotificationTrigger}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 4: Google Sheets Database Center (Replaces Firebase Firestore) */}
        {activeTab === 'sheets-db' && (
          <GoogleSheetsDbView
            shifts={shifts}
            onUpdateShifts={handleUpdateShifts}
          />
        )}

        {/* Tab 5: LINE OA Notifier */}
        {activeTab === 'line' && (
          <LineNotifier
            shifts={shifts}
            onUpdateShifts={handleUpdateShifts}
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
      />

      {/* Native App-Style Bottom Navigation for Mobile / Tablet screens */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shiftsCount={shifts.length}
        lineConfigured={Boolean(channelAccessToken.trim())}
      />
    </div>
  );
}
