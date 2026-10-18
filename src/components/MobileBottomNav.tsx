import React from 'react';
import {
  FileSpreadsheet,
  CheckSquare,
  MessageSquare,
  CalendarCheck,
  Database,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'roster' | 'tasks' | 'sync' | 'firebase' | 'line' | 'desk-calendar';
  setActiveTab: (tab: 'roster' | 'tasks' | 'sync' | 'firebase' | 'line' | 'desk-calendar') => void;
  shiftsCount: number;
  lineConfigured: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  shiftsCount,
  lineConfigured,
}) => {
  return (
    <nav
      aria-label="การนำทางสำหรับมือถือ"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-t border-neutral-800 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-5 items-center justify-items-center">
        {/* Tab 1: ตารางเวร */}
        <button
          onClick={() => setActiveTab('roster')}
          className={`relative flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all active:scale-90 ${
            activeTab === 'roster' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'roster' ? 'bg-emerald-500/20 text-emerald-400' : ''
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[62px]">
            ตารางเวร
          </span>
          {shiftsCount > 0 && (
            <span className="absolute top-0 right-3.5 px-1 rounded-full text-[9px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
              {shiftsCount > 99 ? '99+' : shiftsCount}
            </span>
          )}
        </button>

        {/* Tab 2: Google Tasks */}
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all active:scale-90 ${
            activeTab === 'tasks' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'tasks' ? 'bg-sky-500/20 text-sky-400' : ''
            }`}
          >
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[62px]">
            Tasks
          </span>
        </button>

        {/* Tab 3: แจ้งเตือน LINE OA */}
        <button
          onClick={() => setActiveTab('line')}
          className={`relative flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all active:scale-90 ${
            activeTab === 'line' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'line' ? 'bg-emerald-500/20 text-emerald-400' : ''
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[62px]">
            แจ้ง LINE
          </span>
          <span
            className={`absolute top-0.5 right-4 w-2 h-2 rounded-full border border-black ${
              lineConfigured ? 'bg-emerald-400' : 'bg-neutral-600'
            }`}
          />
        </button>

        {/* Tab 4: ปฏิทินตั้งโต๊ะ 3D */}
        <button
          onClick={() => setActiveTab('desk-calendar')}
          className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all active:scale-90 ${
            activeTab === 'desk-calendar' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'desk-calendar' ? 'bg-purple-500/20 text-purple-400' : ''
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[62px]">
            ปฏิทิน 3D
          </span>
        </button>

        {/* Tab 5: ซิงค์ & คลาวด์ */}
        <button
          onClick={() => setActiveTab(activeTab === 'firebase' ? 'firebase' : 'sync')}
          className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all active:scale-90 ${
            activeTab === 'sync' || activeTab === 'firebase'
              ? 'text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'sync' || activeTab === 'firebase'
                ? 'bg-amber-500/20 text-amber-400'
                : ''
            }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[62px]">
            ซิงค์/คลาวด์
          </span>
        </button>
      </div>
    </nav>
  );
};
