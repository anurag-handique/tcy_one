import * as React from 'react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Clock, Calendar, CheckCircle2, Coffee, TrendingUp, Sparkles } from 'lucide-react';

interface WeeklyTimesheetBarProps {
  employeeId?: string;
  targetWeeklyHours?: number; // default 40
  className?: string;
}

export function WeeklyTimesheetBar({
  employeeId,
  targetWeeklyHours = 40,
  className = '',
}: WeeklyTimesheetBarProps) {
  const { currentUser } = useAuthStore();
  const { attendance, attendancePolicy } = useDataStore();

  const targetEmpId = employeeId || currentUser?.id;
  const standardDaily = attendancePolicy?.standard_hours || 8;

  // Calculate dates for current week (Monday to Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  // Distance to Monday (if today is Sunday (0), distance is -6, else 1 - dayOfWeek)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === today.toISOString().split('T')[0];
    const isFuture = d > today && !isToday;
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();

    // Match attendance
    const att = attendance.find(
      (a) => a.employee_id === targetEmpId && a.date === dateStr
    );

    let hours = att?.total_hours || 0;
    // If today and currently active (no clock_out), compute live hours
    if (isToday && att?.clock_in && !att?.clock_out) {
      const now = new Date();
      const inTime = new Date(att.clock_in);
      const gross = Math.max(0, (now.getTime() - inTime.getTime()) / (1000 * 60 * 60));
      const breakH = (att.break_minutes || 0) / 60;
      hours = Math.max(0, Math.round((gross - breakH) * 10) / 10);
    }

    const breakMins = att?.break_minutes || 0;
    const isPresent = Boolean(att?.clock_in);
    const isOT = hours > standardDaily;

    return {
      dateStr,
      dayLabel,
      dayNum,
      isToday,
      isFuture,
      hours,
      breakMins,
      status: att?.status || (isFuture ? 'future' : 'off'),
      isPresent,
      isOT,
    };
  });

  const totalWeekHours = weekDays.reduce((sum, d) => sum + d.hours, 0);
  const roundedWeekHours = Math.round(totalWeekHours * 10) / 10;
  const totalWeekBreaks = weekDays.reduce((sum, d) => sum + d.breakMins, 0);
  const percentComplete = Math.min(100, Math.round((roundedWeekHours / targetWeeklyHours) * 100));
  const remainingHours = Math.max(0, Math.round((targetWeeklyHours - roundedWeekHours) * 10) / 10);

  return (
    <div className={`desktop-panel rounded-xl p-4 border border-[#202737] bg-[#0e121a]/80 backdrop-blur-md ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-[#1c2332] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide font-sans">
                WEEKLY TIMESHEET TRACKER
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Target: {targetWeeklyHours}h
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Monday – Sunday working pace and capacity utilization
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1 font-mono">
            <span className="text-lg font-extrabold text-white">{roundedWeekHours}h</span>
            <span className="text-xs text-slate-400">/ {targetWeeklyHours}h</span>
          </div>
          <span className="text-[10px] font-mono font-medium text-emerald-400">
            {percentComplete}% of weekly quota
          </span>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="h-2 w-full bg-[#161a25] rounded-full overflow-hidden border border-[#232a39] p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentComplete >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : percentComplete >= 75
                ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500'
            }`}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            {remainingHours > 0 ? (
              <span>⚡ {remainingHours}h remaining to hit 40h target</span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> 40h Target Achieved! (+{Math.round((roundedWeekHours - targetWeeklyHours) * 10) / 10}h OT)
              </span>
            )}
          </span>
          {totalWeekBreaks > 0 && (
            <span className="flex items-center gap-1 text-amber-300/80">
              <Coffee className="h-3 w-3 text-amber-400" />
              <span>{totalWeekBreaks}m total breaks</span>
            </span>
          )}
        </div>
      </div>

      {/* 7-Day Visual Bars Grid */}
      <div className="grid grid-cols-7 gap-2 pt-2 border-t border-[#181f2c]">
        {weekDays.map((day) => {
          const heightPercent = Math.min(100, Math.round((day.hours / 10) * 100)); // 10h is 100% height max
          return (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                day.isToday
                  ? 'bg-blue-950/20 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                  : 'bg-[#12151e] border-[#1f2636]'
              }`}
            >
              {/* Day Label */}
              <span className={`text-[11px] font-bold ${day.isToday ? 'text-blue-300' : 'text-slate-300'}`}>
                {day.dayLabel}
              </span>
              <span className="text-[9px] font-mono text-slate-500 mb-2">
                {day.dayNum}
              </span>

              {/* Bar Container */}
              <div className="h-16 w-3 bg-[#171b26] rounded-full relative flex items-end justify-center overflow-hidden border border-[#242c3d]">
                {/* 8h target indicator tick (80% from bottom) */}
                <div className="absolute top-[20%] left-0 right-0 h-[1px] bg-slate-600/60 z-10" />

                <div
                  className={`w-full rounded-full transition-all duration-300 ${
                    day.hours >= standardDaily
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : day.hours >= 4
                      ? 'bg-blue-500'
                      : day.hours > 0
                      ? 'bg-amber-500'
                      : 'bg-transparent'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Hours Logged */}
              <span className={`mt-2 font-mono text-[11px] font-bold ${day.hours > 0 ? 'text-white' : 'text-slate-600'}`}>
                {day.hours > 0 ? `${day.hours}h` : '--'}
              </span>

              {/* Break or status indicator */}
              <div className="mt-0.5 h-3 flex items-center justify-center">
                {day.breakMins > 0 ? (
                  <span className="text-[8px] font-mono text-amber-400 font-semibold" title={`${day.breakMins} mins break`}>
                    {day.breakMins}m
                  </span>
                ) : day.isOT ? (
                  <span className="text-[8px] font-mono text-purple-400 font-bold" title="Overtime logged">
                    OT
                  </span>
                ) : day.isToday ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
