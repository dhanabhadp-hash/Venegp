import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  CheckCircle,
  Sun,
  Sunset,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
  CalendarCheck,
  BarChart2,
} from 'lucide-react';
import { DutyShift, ShiftType } from '../types/roster';
import { isWeekendOrHoliday } from '../data/mockRosters';

interface RosterAnalyzerProps {
  shifts: DutyShift[];
  onUpdateShifts: (shifts: DutyShift[]) => void;
  onSendSingleNotification: (shift: DutyShift) => void;
  onOpenSyncModal: () => void;
}

export const RosterAnalyzer: React.FC<RosterAnalyzerProps> = ({
  shifts,
  onUpdateShifts,
  onSendSingleNotification,
  onOpenSyncModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('all');
  const [selectedDayType, setSelectedDayType] = useState<string>('all'); // all, weekday, weekend

  // New shift form state (Strictly 2 shifts: เช้า OT & บ่าย 4 ชม. OT)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newDate, setNewDate] = useState('2026-10-01');
  const [newShiftType, setNewShiftType] = useState<ShiftType>('morning');
  const [newLineId, setNewLineId] = useState('');

  // 1. Analytics & Statistics
  const stats = useMemo(() => {
    const total = shifts.length;
    const staffMap = new Map<string, { morning: number; afternoon: number; total: number }>();
    let morningCount = 0;
    let afternoonCount = 0;
    let weekdayCount = 0;
    let weekendCount = 0;

    shifts.forEach(s => {
      const current = staffMap.get(s.staffName) || { morning: 0, afternoon: 0, total: 0 };
      if (s.shiftType === 'morning') {
        morningCount++;
        current.morning++;
      } else {
        afternoonCount++;
        current.afternoon++;
      }
      current.total++;
      staffMap.set(s.staffName, current);

      if (isWeekendOrHoliday(s.date)) {
        weekendCount++;
      } else {
        weekdayCount++;
      }
    });

    const staffDistribution = Array.from(staffMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    return {
      total,
      uniqueStaffCount: staffMap.size,
      morningCount,
      afternoonCount,
      weekdayCount,
      weekendCount,
      staffDistribution,
    };
  }, [shifts]);

  // Filtered shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchSearch =
        s.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.date.includes(searchTerm) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchShift = selectedShiftType === 'all' || s.shiftType === selectedShiftType;
      
      const isWeekend = isWeekendOrHoliday(s.date);
      const matchDay =
        selectedDayType === 'all' ||
        (selectedDayType === 'weekend' && isWeekend) ||
        (selectedDayType === 'weekday' && !isWeekend);

      return matchSearch && matchShift && matchDay;
    });
  }, [shifts, searchTerm, selectedShiftType, selectedDayType]);

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newDate) return;

    const isMorning = newShiftType === 'morning';
    const shiftName = isMorning ? 'เช้า OT (เอกสาร)' : 'บ่าย 4 ชม. OT (เอกสาร)';
    const startTime = isMorning ? '08:30' : '16:00';
    const endTime = isMorning ? '16:30' : '20:00';

    const newShift: DutyShift = {
      id: `shift-custom-${Date.now()}`,
      date: newDate,
      staffName: newStaffName.trim(),
      shiftType: newShiftType,
      shiftName,
      startTime,
      endTime,
      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
      lineUserId: newLineId.trim(),
      location: 'ห้องยาและคลังยา รพ.สบปราบ',
      notes: 'งานเอกสารและจ่ายยา OT',
      status: 'confirmed',
    };

    onUpdateShifts([...shifts, newShift]);
    setNewStaffName('');
    setNewLineId('');
    setShowAddForm(false);
  };

  const handleDeleteShift = (id: string) => {
    onUpdateShifts(shifts.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* 1. Swiss Modernism 2.0 KPI Summary Cards (Asymmetric 12-col grid) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Total Roster Shifts (4 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            TOTAL DUTY ASSIGNMENTS
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-white mt-2">
            {stats.total}
          </div>
          <div className="text-xs text-neutral-400 mt-1 font-mono">
            {stats.uniqueStaffCount} เจ้าหน้าที่ • กลุ่มงานเภสัชกรรม
          </div>
        </div>

        {/* Morning OT (4 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5" /> เช้า OT (08:30 - 16:30)
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-white mt-2">
            {stats.morningCount} <span className="text-xs font-normal text-neutral-400 font-sans">เวร</span>
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            วันหยุดเสาร์-อาทิตย์ • แจ้งเตือน 07:55 น.
          </div>
        </div>

        {/* Afternoon OT (4 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sunset className="w-3.5 h-3.5" /> บ่าย 4 ชม. OT (16:00 - 20:00)
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-white mt-2">
            {stats.afternoonCount} <span className="text-xs font-normal text-neutral-400 font-sans">เวร</span>
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            วันจันทร์-ศุกร์ • แจ้งเตือน 15:55 น. & 20:00 น.
          </div>
        </div>

        {/* Sync & LINE Status (4 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#121214] border border-neutral-800 rounded-lg p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            STAFF LINE DIRECTORY
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-emerald-400 mt-2">
            4 / 4
          </div>
          <div className="text-xs text-neutral-400 mt-1 font-mono">
            มี LINE User ID พร้อมรับการแจ้งเตือน
          </div>
        </div>
      </div>

      {/* Staff Workload Distribution (Swiss Grid Table) */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              WORKLOAD RATIO PER STAFF
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              การกระจายภาระงานเจ้าหน้าที่ รพ.สบปราบ (รวม 20 กะ)
            </h3>
          </div>
          <div className="text-xs font-mono text-neutral-400">
            ตุลาคม 2569
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {stats.staffDistribution.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-lg bg-[#18181B] border border-neutral-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs font-bold text-white leading-snug">{item.name}</div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    เช้า {item.morning} • บ่าย {item.afternoon}
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-white bg-neutral-800 px-2 py-0.5 rounded">
                  {item.total} เวร
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-white h-1.5 rounded-full"
                  style={{ width: `${(item.total / 6) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Roster Table & Controls */}
      <div className="bg-[#121214] border border-neutral-800 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              ROSTER SHIFTS DIRECTORY
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              รายการตารางเข้าเวร ({filteredShifts.length} กะ)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มเวร
            </button>
            <button
              onClick={onOpenSyncModal}
              className="px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg tracking-wide transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              ซิงค์ลง Google Tasks & Calendar
            </button>
          </div>
        </div>

        {/* Add Shift Inline Form */}
        {showAddForm && (
          <form onSubmit={handleAddShift} className="my-4 p-4 bg-[#18181B] border border-neutral-700 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">ชื่อเจ้าหน้าที่</label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={e => setNewStaffName(e.target.value)}
                placeholder="เช่น น.ส.กนกวรรณ ศรีจันทร์"
                className="w-full bg-[#121214] border border-neutral-700 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">วันที่เข้าเวร</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full bg-[#121214] border border-neutral-700 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">กะการทำงาน (มี 2 กะ)</label>
              <select
                value={newShiftType}
                onChange={e => setNewShiftType(e.target.value as ShiftType)}
                className="w-full bg-[#121214] border border-neutral-700 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-white"
              >
                <option value="morning">เช้า OT (08:30 - 16:30 น.)</option>
                <option value="afternoon">บ่าย 4 ชม. OT (16:00 - 20:00 น.)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">LINE User ID</label>
              <input
                type="text"
                value={newLineId}
                onChange={e => setNewLineId(e.target.value)}
                placeholder="Ua1b2c3d..."
                className="w-full bg-[#121214] border border-neutral-700 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-white font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold py-1.5 px-3 rounded transition-colors"
              >
                บันทึกเวร
              </button>
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อคนอยู่เวร, วันที่ (YYYY-MM-DD)..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#18181B] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedShiftType}
              onChange={e => setSelectedShiftType(e.target.value)}
              className="bg-[#18181B] border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-600"
            >
              <option value="all">ทุกกะการทำงาน (2 กะ)</option>
              <option value="morning">เช้า OT (08:30 - 16:30)</option>
              <option value="afternoon">บ่าย 4 ชม. OT (16:00 - 20:00)</option>
            </select>

            <select
              value={selectedDayType}
              onChange={e => setSelectedDayType(e.target.value)}
              className="bg-[#18181B] border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-600"
            >
              <option value="all">ทุกวัน</option>
              <option value="weekday">วันจันทร์ - ศุกร์</option>
              <option value="weekend">วันเสาร์-อาทิตย์ / นักขัตฤกษ์</option>
            </select>
          </div>
        </div>

        {/* Shifts Table */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-[#18181B] text-neutral-400 font-mono text-[11px] uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="p-3">วันที่</th>
                <th className="p-3">ชื่อคนอยู่เวร</th>
                <th className="p-3">กะ / ช่วงเวลา</th>
                <th className="p-3">เงื่อนไขเวลาส่งแจ้งเตือน LINE</th>
                <th className="p-3">LINE User ID</th>
                <th className="p-3 text-center">ทดสอบแจ้งเตือน</th>
                <th className="p-3 text-right">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                    No matching roster entries found
                  </td>
                </tr>
              ) : (
                filteredShifts.map(shift => {
                  const isWeekend = isWeekendOrHoliday(shift.date);
                  return (
                    <tr key={shift.id} className="hover:bg-neutral-850/60 transition-colors">
                      <td className="p-3 whitespace-nowrap font-mono font-medium text-white">
                        {shift.date}
                        {isWeekend && (
                          <span className="ml-1.5 text-[10px] text-emerald-400 font-sans">
                            (วันหยุด)
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-white">{shift.staffName}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                              shift.shiftType === 'morning'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                            }`}
                          >
                            {shift.shiftType === 'morning' ? <Sun className="w-3 h-3" /> : <Sunset className="w-3 h-3" />}
                            {shift.shiftName}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400">
                            {shift.startTime} - {shift.endTime} น.
                          </span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                        {isWeekend ? (
                          <span className="text-emerald-400">
                            07:55 น. (1 ครั้ง)
                          </span>
                        ) : (
                          <span className="text-neutral-300">
                            15:55 น. & 20:00 น. (2 ครั้ง)
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                        {shift.lineUserId ? (
                          <span className="text-emerald-400 font-mono">
                            {shift.lineUserId.substring(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-neutral-600 italic font-sans">ยังไม่ผูก</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => onSendSingleNotification(shift)}
                          className="inline-flex items-center gap-1 bg-[#18181B] hover:bg-neutral-800 text-neutral-200 border border-neutral-700 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          ส่งแจ้งเตือน
                        </button>
                      </td>
                      <td className="p-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
