import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'menu';
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // If already running as an installed PWA / standalone, suppress the install buttons
  if (isStandalone || isInstalled) {
    return null;
  }

  // Handle install trigger
  const handleTrigger = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        console.log('App installed successfully');
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Ambient browsers or desktop where prompt not yet fired
      setShowIOSModal(true);
    }
  };

  // Banner variant for mobile devices
  if (variant === 'banner') {
    if (bannerDismissed) return null;

    return (
      <>
        <div className="bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-white">ติดตั้งแอป DutySync</span>
              <span className="hidden sm:inline text-neutral-400 ml-1.5 text-[11px]">
                ใช้งานแบบแอปมือถือเต็มจอ ทำงานได้แม้ออฟไลน์
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTrigger}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95 font-mono"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ติดตั้ง</span>
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-neutral-400 hover:text-white p-1 rounded transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* iOS / General Install Guide Modal */}
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#121214] border border-neutral-700 p-6 shadow-2xl font-['Inter','Prompt',sans-serif]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      ติดตั้ง DutySync ลงบนเครื่อง
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Progressive Web App (PWA)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-neutral-300">
                {isIOS ? (
                  <>
                    <p className="text-neutral-400 text-[11px]">
                      สำหรับ iPhone หรือ iPad บน Safari:
                    </p>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                      <div className="p-1.5 rounded bg-neutral-800 text-sky-400 shrink-0">
                        <Share className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">1. กดปุ่มแชร์ (Share)</span>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          ปุ่มสี่เหลี่ยมลูกศรชี้ขึ้น ที่แถบด้านล่างหรือด้านบนของ Safari
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                      <div className="p-1.5 rounded bg-neutral-800 text-emerald-400 shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">2. เลือก "เพิ่มไปยังหน้าจอโฮม"</span>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          (Add to Home Screen) แอปจะปรากฏเป็นไอคอนบนหน้าจอหลักของคุณ
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-neutral-400 text-[11px]">
                      สำหรับ Chrome, Edge หรือเบราว์เซอร์บน Android / PC:
                    </p>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                      <div className="p-1.5 rounded bg-neutral-800 text-emerald-400 shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">ติดตั้งแอปผ่านแถบที่อยู่</span>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          กดไอคอนคอมพิวเตอร์หรือเครื่องหมายติดตั้ง <Download className="w-3 h-3 inline text-emerald-400" /> ที่แถบ URL ของเบราว์เซอร์
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> ข้อดีเมื่อติดตั้งแอป DutySync
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-neutral-300">
                    <li>เปิดใช้งานเร็วขึ้น ไม่ต้องเข้าเบราว์เซอร์</li>
                    <li>หน้าจอขยายเต็มจอ ไร้แถบ URL กวนใจ</li>
                    <li>สามารถเปิดดูตารางเวรได้แม้อยู่ในที่ไม่มีสัญญาณเน็ต</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="mt-5 w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors font-mono"
              >
                รับทราบ / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Header button variant
  return (
    <>
      <button
        onClick={handleTrigger}
        title="ติดตั้งแอปพลิเคชัน DutySync (PWA)"
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono transition-colors active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="hidden md:inline font-medium">ติดตั้งแอป PWA</span>
        <span className="inline md:hidden font-medium">ติดตั้ง</span>
      </button>

      {/* Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#121214] border border-neutral-700 p-6 shadow-2xl font-['Inter','Prompt',sans-serif]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ติดตั้ง DutySync ลงบนเครื่อง
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Progressive Web App (PWA)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-300">
              {isIOS ? (
                <>
                  <p className="text-neutral-400 text-[11px]">
                    สำหรับ iPhone หรือ iPad บน Safari:
                  </p>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="p-1.5 rounded bg-neutral-800 text-sky-400 shrink-0">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white">1. กดปุ่มแชร์ (Share)</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        ปุ่มสี่เหลี่ยมลูกศรชี้ขึ้น ที่แถบด้านล่างหรือด้านบนของ Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="p-1.5 rounded bg-neutral-800 text-emerald-400 shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white">2. เลือก "เพิ่มไปยังหน้าจอโฮม"</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        (Add to Home Screen) แอปจะปรากฏเป็นไอคอนบนหน้าจอหลักของคุณ
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-neutral-400 text-[11px]">
                    สำหรับ Chrome, Edge หรือเบราว์เซอร์บน Android / PC:
                  </p>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="p-1.5 rounded bg-neutral-800 text-emerald-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white">ติดตั้งแอปผ่านแถบที่อยู่</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        กดไอคอนคอมพิวเตอร์หรือเครื่องหมายติดตั้ง <Download className="w-3 h-3 inline text-emerald-400" /> ที่แถบ URL ของเบราว์เซอร์
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> ข้อดีเมื่อติดตั้งแอป DutySync
                </div>
                <ul className="space-y-1 list-disc list-inside text-neutral-300">
                  <li>เปิดใช้งานเร็วขึ้น ไม่ต้องเข้าเบราว์เซอร์</li>
                  <li>หน้าจอขยายเต็มจอ ไร้แถบ URL กวนใจ</li>
                  <li>สามารถเปิดดูตารางเวรได้แม้อยู่ในที่ไม่มีสัญญาณเน็ต</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors font-mono"
            >
              รับทราบ / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
};
