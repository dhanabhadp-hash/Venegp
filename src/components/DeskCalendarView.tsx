import React, { useState, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Clock,
  Printer,
  Check,
} from 'lucide-react';
import { DutyShift } from '../types/roster';
import { isWeekendOrHoliday } from '../data/mockRosters';
import confetti from 'canvas-confetti';

interface DeskCalendarViewProps {
  shifts: DutyShift[];
}

export const DeskCalendarView: React.FC<DeskCalendarViewProps> = ({ shifts }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1)); // October 2026
  const [calendarTheme, setCalendarTheme] = useState<'swiss-dark' | 'swiss-light'>('swiss-dark');
  const [isExporting, setIsExporting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const monthNamesEng = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar grid calculations
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      shifts: DutyShift[];
    }> = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isWeekend: isWeekendOrHoliday(dateStr),
        shifts: shifts.filter(s => s.date === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isWeekend: isWeekendOrHoliday(dateStr),
        shifts: shifts.filter(s => s.date === dateStr),
      });
    }

    // Next month padding to fill complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isWeekend: isWeekendOrHoliday(dateStr),
        shifts: shifts.filter(s => s.date === dateStr),
      });
    }

    return days;
  }, [year, month, shifts]);

  // Shifts in this month
  const thisMonthShifts = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return shifts.filter(s => s.date.startsWith(monthPrefix));
  }, [year, month, shifts]);

  // Export high-resolution Swiss Modernism calendar canvas
  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1600;
      canvas.height = 1050;

      // Swiss Minimalist background
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, 1600, 1050);

      // Card frame
      const cardX = 100;
      const cardY = 60;
      const cardW = 1400;
      const cardH = 930;

      ctx.fillStyle = '#121214';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Spiral wire binding rings (Modern industrial Swiss rings)
      const ringsCount = 24;
      const ringSpacing = (cardW - 80) / (ringsCount - 1);
      for (let i = 0; i < ringsCount; i++) {
        const rx = cardX + 40 + i * ringSpacing;
        // Ring hole
        ctx.fillStyle = '#27272A';
        ctx.beginPath();
        ctx.arc(rx, cardY + 22, 6, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = '#71717A';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(rx, cardY + 6, 12, Math.PI * 0.8, Math.PI * 2.2);
        ctx.stroke();
      }

      // Hospital & Department Header
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('โรงพยาบาลสบปราบ • กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค', cardX + 50, cardY + 70);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`ตารางการปฏิบัติงาน ${monthNamesThai[month]} พ.ศ. ${year + 543}`, cardX + 50, cardY + 110);

      // Subtitle
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        `เช้า OT (08:30 - 16:30 น.) • บ่าย 4 ชม. OT (16:00 - 20:00 น.) | รวม ${thisMonthShifts.length} กะ`,
        cardX + 50,
        cardY + 135
      );

      // Schedule rules box
      ctx.fillStyle = '#18181B';
      ctx.fillRect(cardX + cardW - 480, cardY + 60, 430, 75);
      ctx.strokeStyle = '#27272A';
      ctx.strokeRect(cardX + cardW - 480, cardY + 60, 430, 75);

      ctx.fillStyle = '#E4E4E7';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SCHEDULE TRIGGER CONDITIONS', cardX + cardW - 465, cardY + 82);
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '11px sans-serif';
      ctx.fillText('• จันทร์-ศุกร์: ส่ง 2 เวลา (15:55 น. & 20:00 น.)', cardX + cardW - 465, cardY + 102);
      ctx.fillText('• เสาร์-อาทิตย์ / นักขัตฤกษ์: ส่ง 1 เวลา (07:55 น.)', cardX + cardW - 465, cardY + 122);

      // Days of week header
      const daysOfWeek = ['อาทิตย์ (SUN)', 'จันทร์ (MON)', 'อังคาร (TUE)', 'พุธ (WED)', 'พฤหัส (THU)', 'ศุกร์ (FRI)', 'เสาร์ (SAT)'];
      const gridX = cardX + 50;
      const gridY = cardY + 160;
      const cellW = (cardW - 100) / 7;
      const cellH = (cardH - 220) / 6;

      daysOfWeek.forEach((dayName, idx) => {
        ctx.fillStyle = idx === 0 || idx === 6 ? '#F43F5E' : '#A1A1AA';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dayName, gridX + idx * cellW + cellW / 2, gridY);
      });

      // Grid line separator
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gridX, gridY + 10);
      ctx.lineTo(gridX + cellW * 7, gridY + 10);
      ctx.stroke();

      // Cells
      calendarGrid.slice(0, 35).forEach((cell, idx) => {
        const col = idx % 7;
        const row = Math.floor(idx / 7);
        const cx = gridX + col * cellW;
        const cy = gridY + 20 + row * cellH;

        ctx.strokeStyle = '#1F1F23';
        ctx.strokeRect(cx, cy, cellW, cellH);

        // Day Number
        ctx.textAlign = 'left';
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = cell.isCurrentMonth
          ? (col === 0 || col === 6 ? '#F43F5E' : '#FFFFFF')
          : '#3F3F46';
        ctx.fillText(String(cell.day), cx + 10, cy + 22);

        // Shifts inside cell
        if (cell.shifts.length > 0) {
          cell.shifts.slice(0, 2).forEach((shift, sIdx) => {
            const sy = cy + 30 + sIdx * 28;

            ctx.fillStyle = shift.shiftType === 'morning' ? '#064E3B' : '#78350F';
            ctx.beginPath();
            ctx.roundRect(cx + 6, sy, cellW - 12, 24, 4);
            ctx.fill();

            ctx.strokeStyle = shift.shiftType === 'morning' ? '#059669' : '#D97706';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(
              `${shift.staffName.substring(0, 11)} (${shift.startTime})`,
              cx + 10,
              sy + 16
            );
          });
        }
      });

      // Footer
      ctx.fillStyle = '#71717A';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        'โรงพยาบาลสบปราบ • กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค • ระบบแจ้งเตือน LINE OA',
        cardX + cardW / 2,
        cardY + cardH - 20
      );

      const imageURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageURL;
      downloadLink.download = `ตารางเวร_รพ_สบปราบ_${monthNamesThai[month]}_${year + 543}.png`;
      downloadLink.click();

      confetti({ particleCount: 50, spread: 50 });
    } catch (err) {
      console.error('Export error:', err);
      alert('ไม่สามารถส่งออกภาพได้');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            DESKTOP CALENDAR VIEW • รพ.สบปราบ
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mt-0.5">
            ปฏิทินตั้งโต๊ะแสดงตารางการปฏิบัติงาน
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            แสดงข้อมูลเจ้าหน้าที่ผู้ปฏิบัติงาน 20 เวร (เช้า OT 08:30-16:30 น. และ บ่าย 4 ชม. OT 16:00-20:00 น.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month selector */}
          <div className="flex items-center bg-[#18181B] border border-neutral-800 rounded-lg px-2 py-1">
            <button
              onClick={prevMonth}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-white">
              {monthNamesThai[month]} {year + 543}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'กำลังบันทึกภาพ...' : 'ดาวน์โหลดภาพปฏิทิน (PNG)'}
          </button>
        </div>
      </div>

      {/* 2. Swiss Modernism Desk Calendar Mockup */}
      <div className="bg-[#09090B] border border-neutral-800 rounded-lg p-6 sm:p-10">
        <div
          ref={calendarRef}
          className="max-w-4xl mx-auto bg-[#121214] text-white border border-neutral-800 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Industrial Wire Ring Bar */}
          <div className="h-10 bg-[#18181B] border-b border-neutral-800 flex items-center justify-around px-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-2 h-5 rounded-full bg-neutral-600 shadow transform -translate-y-1.5" />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 -mt-1" />
              </div>
            ))}
          </div>

          {/* Calendar Content */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-5 border-b border-neutral-800 gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
                  โรงพยาบาลสบปราบ • กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                  {monthNamesThai[month]} {year + 543}
                </h1>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  เช้า OT (08:30 - 16:30 น.) • บ่าย 4 ชม. OT (16:00 - 20:00 น.)
                </p>
              </div>

              <div className="p-3 bg-[#18181B] rounded border border-neutral-800 text-[11px] font-mono text-neutral-300">
                <div className="text-emerald-400 font-bold mb-0.5">เงื่อนไขการส่งแจ้งเตือน:</div>
                <div>• จ.-ศ.: ส่ง 15:55 น. & 20:00 น.</div>
                <div>• ส.-อา./นักขัตฯ: ส่ง 07:55 น.</div>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4 text-center">
              {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, idx) => (
                <div
                  key={idx}
                  className={`text-xs font-mono font-bold py-1.5 rounded ${
                    idx === 0 || idx === 6
                      ? 'text-rose-400 bg-rose-950/20 border border-rose-900/30'
                      : 'text-neutral-400 bg-[#18181B]'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
              {calendarGrid.map((cell, idx) => {
                const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                const hasShifts = cell.shifts.length > 0;

                return (
                  <div
                    key={idx}
                    className={`min-h-[85px] sm:min-h-[96px] p-2 rounded border transition-colors flex flex-col justify-between ${
                      cell.isCurrentMonth
                        ? hasShifts
                          ? 'bg-[#18181B] border-neutral-700'
                          : 'bg-[#141416] border-neutral-800/80'
                        : 'opacity-30 bg-[#09090B] border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isWeekend ? 'text-rose-400' : 'text-neutral-200'
                        }`}
                      >
                        {cell.day}
                      </span>
                      {hasShifts && (
                        <span className="text-[10px] font-mono bg-neutral-800 text-neutral-300 px-1 rounded">
                          {cell.shifts.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-hidden">
                      {cell.shifts.slice(0, 2).map(shift => (
                        <div
                          key={shift.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center justify-between border ${
                            shift.shiftType === 'morning'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          }`}
                        >
                          <span className="truncate">{shift.staffName.split(' ')[0]}</span>
                          <span className="text-[9px] font-mono opacity-75 shrink-0 ml-1">
                            {shift.startTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer */}
            <div className="mt-6 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-emerald-500" />
                  เช้า OT (08:30 - 16:30 น.)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-amber-500" />
                  บ่าย 4 ชม. OT (16:00 - 20:00 น.)
                </span>
              </div>
              <div className="text-neutral-500">
                ผู้จัดเวร: นางรุ่งนภา ถึงทุ่ง | ผู้อนุมัติ: นพ.สิทธิกร สาริวาท
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
