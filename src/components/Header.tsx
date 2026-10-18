import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  FileSpreadsheet,
  MessageSquare,
  ShieldCheck,
  CalendarCheck,
  Building2,
  Database,
  UserCheck,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export type AppTab = 'roster' | 'tasks' | 'sync' | 'sheets-db' | 'line' | 'desk-calendar';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  shiftsCount: number;
  lineConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  shiftsCount,
  lineConfigured,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="border-b border-neutral-800 bg-[#09090B]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Hospital Title (Swiss Typography) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold tracking-tight shrink-0 shadow-sm">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                  รพ.สบปราบ
                </span>
                <span className="text-neutral-500 font-mono text-xs hidden xs:inline">/</span>
                <span className="text-xs font-mono font-medium text-emerald-400 hidden xs:inline">
                  DUTYSYNC
                </span>
                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  กลุ่มงานเภสัชกรรม
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-neutral-400 hidden lg:block truncate">
                ตารางเวร 1 - 31 ต.ค. 2569 • ฐานข้อมูล Google Sheets Database • LINE OA • โหมดใช้งานคนเดียว (PWA)
              </p>
            </div>
          </div>

          {/* Actions: Online Status + Single-User Mode Badge + PWA Install */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Online/Offline Status Indicator */}
            <div
              title={isOnline ? 'เชื่อมต่อออนไลน์พร้อมใช้งาน' : 'โหมดออฟไลน์ ทำงานจากแคช'}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400 hidden xs:flex"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Single User Badge (No Auth Required) */}
            <div
              title="ใช้งานในโหมดเดี่ยว (Single User Mode) ไม่ต้องล็อกอิน ข้อมูลซิงค์กับ Google Sheets"
              className="flex items-center gap-1.5 bg-[#18181B] px-2.5 py-1 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-200"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold">
                <UserCheck className="w-3 h-3" />
              </div>
              <div className="hidden sm:block text-left text-[11px]">
                <span className="font-semibold text-white">ผู้ใช้งาน</span>
                <span className="text-neutral-500 ml-1.5 text-[10px]">โหมดเดี่ยว</span>
              </div>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-neutral-800/80 pt-1.5 pb-2 overflow-x-auto no-scrollbar font-mono text-xs">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets & ตารางเวร</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-900 text-neutral-300 border border-neutral-700">
              {shiftsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>Google Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'sync'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>ซิงค์ Tasks & Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets-db')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'sheets-db'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>ฐานข้อมูล Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveTab('line')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'line'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>แจ้งเตือน LINE OA</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                lineConfigured ? 'bg-emerald-400' : 'bg-neutral-600'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveTab('desk-calendar')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'desk-calendar'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>ปฏิทินตั้งโต๊ะ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
