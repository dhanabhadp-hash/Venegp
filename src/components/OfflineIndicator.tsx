import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="การแจ้งเตือนสถานะการเชื่อมต่อเครือข่าย"
      className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center justify-between gap-3 rounded-xl bg-amber-500/95 text-black px-4 py-3 shadow-2xl backdrop-blur-md border border-amber-400 font-mono text-xs animate-bounce"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 text-black" />
        <span className="font-semibold text-neutral-900">
          โหมดออฟไลน์ (Offline PWA) — ทำงานจากแคชบนเครื่อง
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 rounded bg-black/15 hover:bg-black/25 text-neutral-950 font-bold transition-colors flex items-center gap-1 shrink-0"
      >
        <RefreshCw className="w-3 h-3" />
        ลองใหม่
      </button>
    </aside>
  );
};
