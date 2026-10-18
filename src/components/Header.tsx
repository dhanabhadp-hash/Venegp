import React from 'react';
import { User } from 'firebase/auth';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  FileSpreadsheet,
  MessageSquare,
  LogOut,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Building2,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  user: User | null;
  token: string | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  activeTab: 'roster' | 'tasks' | 'sync' | 'firebase' | 'line' | 'desk-calendar';
  setActiveTab: (tab: 'roster' | 'tasks' | 'sync' | 'firebase' | 'line' | 'desk-calendar') => void;
  shiftsCount: number;
  lineConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
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
                ตารางเวร 1 - 31 ต.ค. 2569 • Tasks & Sheets • Firebase (asia-east1) • LINE OA • PWA Offline Ready
              </p>
            </div>
          </div>

          {/* Actions: PWA Install + User & Auth Status */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Online/Offline Status Indicator */}
            <div
              title={isOnline ? 'เชื่อมต่อออนไลน์พร้อมใช้งาน' : 'โหมดออฟไลน์ ทำงานจากแคช'}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400 hidden xs:flex"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />
            {user ? (
              <div className="flex items-center space-x-3 bg-[#18181B] px-3 py-1.5 rounded-lg border border-neutral-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full border border-neutral-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white font-mono">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden md:block text-left text-xs font-mono">
                  <div className="font-semibold text-neutral-200 truncate max-w-[130px]">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 inline" /> Google & Firebase Active
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors active:translate-y-px disabled:opacity-50 font-mono"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ Google'}</span>
              </button>
            )}
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
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'firebase'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-amber-500" />
            <span>Firebase Firestore</span>
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
            <span>แจ้งเตือน LINE OA (3 เวลา)</span>
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
