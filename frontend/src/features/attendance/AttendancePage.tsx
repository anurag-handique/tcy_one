import * as React from 'react';
import {
  Clock,
  Play,
  Square,
  Calendar,
  FileEdit,
  History,
  Laptop,
  Building,
  CheckCircle2,
  MapPin,
  Eye,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { Attendance, WorkMode } from '@/types';
import { formatDate, formatTime, formatWorkingDuration, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { UserAvatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';
import { GeoMapView } from './GeoMapView';

export function AttendancePage() {
  const { currentUser, activeRole } = useAuthStore();
  const { setPunchModalOpen } = useUIStore();
  const {
    attendance,
    clockIn,
    clockOut,
    attendanceCorrections,
    requestAttendanceCorrection,
    reviewAttendanceCorrection,
    profiles,
    attendancePolicy,
  } = useDataStore();

  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || activeRole === 'super_admin';

  const todayStr = new Date().toISOString().split('T')[0];
  const matchesCurrentEmployee = (attEmployeeId: string) => {
    return (
      attEmployeeId === currentUser.id ||
      (currentUser.user_id && attEmployeeId === currentUser.user_id) ||
      (currentUser.email && attEmployeeId.toLowerCase() === currentUser.email.toLowerCase())
    );
  };

  const todayAttendance = attendance.find(
    (a) => matchesCurrentEmployee(a.employee_id) && a.date === todayStr
  );
  const isClockedIn = Boolean(todayAttendance && !todayAttendance.clock_out);

  const [selectedWorkMode, setSelectedWorkMode] = React.useState<WorkMode>('office');
  const [correctionModalOpen, setCorrectionModalOpen] = React.useState(false);
  const [selectedAttendanceLog, setSelectedAttendanceLog] = React.useState<Attendance | null>(null);
  const [corrDate, setCorrDate] = React.useState(todayStr);
  const [corrIn, setCorrIn] = React.useState('09:30');
  const [corrOut, setCorrOut] = React.useState('18:30');
  const [corrReason, setCorrReason] = React.useState('');

  const [elapsed, setElapsed] = React.useState<string>('0h 0m');
  React.useEffect(() => {
    const update = () => {
      if (todayAttendance?.clock_in && !todayAttendance.clock_out) {
        setElapsed(formatWorkingDuration(todayAttendance.clock_in, null));
      } else if (todayAttendance?.clock_in && todayAttendance.clock_out) {
        setElapsed(formatWorkingDuration(todayAttendance.clock_in, todayAttendance.clock_out));
      } else {
        setElapsed('0h 0m');
      }
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [todayAttendance]);

  const handlePunchToggle = () => {
    setPunchModalOpen(true, isClockedIn ? 'out' : 'in');
  };

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrReason.trim()) {
      toast.error('Please enter a regularization reason');
      return;
    }

    requestAttendanceCorrection({
      employee_id: currentUser.id,
      requested_by: currentUser.id,
      date: corrDate,
      corrected_clock_in: `${corrDate}T${corrIn}:00Z`,
      corrected_clock_out: `${corrDate}T${corrOut}:00Z`,
      reason: corrReason,
    });

    toast.success('Attendance regularization request submitted');
    setCorrectionModalOpen(false);
    setCorrReason('');
  };

  const myAttendanceHistory = attendance.filter((a) => matchesCurrentEmployee(a.employee_id));
  const totalMonthHours = myAttendanceHistory.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
  const totalOvertimeHours = myAttendanceHistory.reduce((acc, curr) => acc + (curr.overtime_hours || 0), 0);
  const presentDaysCount = myAttendanceHistory.filter((a) => a.status === 'present' || a.status === 'late').length;

  return (
    <div className="space-y-4">
      {/* Header Toolbar with Shift Policy Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              ATTENDANCE & TIMECARDS
            </h1>
            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              Shift: {attendancePolicy.office_start_time} - {attendancePolicy.office_end_time}
            </span>
            <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              Max In: {attendancePolicy.max_punch_in_time}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily clock-in/out registers, official shifts ({attendancePolicy.standard_hours}h standard), overtime tracking, and regularizations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCorrectionModalOpen(true)}
          className="h-7 text-xs border-[#222837] bg-[#12151e] hover:bg-[#181d28] gap-1.5"
        >
          <FileEdit className="h-3.5 w-3.5 text-blue-400" />
          <span>Regularization Request</span>
        </Button>
      </div>

      {/* Main Punch Station & Summary Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Punch Card (5 cols) */}
        <div className="lg:col-span-5 desktop-panel rounded-lg p-4 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#1b202c] pb-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">PUNCH TERMINAL</span>
              <div className="text-xs font-bold text-white">{formatDate(new Date(), 'EEEE, dd MMM yyyy')}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {todayAttendance && todayAttendance.overtime_hours && todayAttendance.overtime_hours > 0 ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20">
                  +{todayAttendance.overtime_hours}h OT
                </span>
              ) : null}
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  isClockedIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isClockedIn ? 'SESSION ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          <div className="text-center py-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
              ELAPSED SHIFT DURATION
            </span>
            <div className="text-4xl font-extrabold font-mono text-white tracking-tight">
              {elapsed}
            </div>
            <div className="flex justify-center gap-3 text-[11px] font-mono text-slate-400 mt-2">
              <span>In: {todayAttendance?.clock_in ? formatTime(todayAttendance.clock_in) : '--:--'}</span>
              <span>•</span>
              <span>Out: {todayAttendance?.clock_out ? formatTime(todayAttendance.clock_out) : '--:--'}</span>
            </div>
          </div>

          {!isClockedIn && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Work Mode:</span>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                {(['office', 'remote', 'hybrid'] as WorkMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedWorkMode(mode)}
                    className={`py-1 rounded border uppercase ${
                      selectedWorkMode === mode
                        ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                        : 'border-[#1b202c] bg-[#11141c] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant={isClockedIn ? 'destructive' : 'default'}
            onClick={handlePunchToggle}
            className={`w-full h-8 text-xs font-mono uppercase tracking-wider font-bold gap-1.5 ${
              !isClockedIn ? 'bg-blue-600 hover:bg-blue-500' : ''
            }`}
          >
            {isClockedIn ? (
              <>
                <Square className="h-3 w-3 fill-current" />
                <span>Punch Out Session</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Punch In Now</span>
              </>
            )}
          </Button>
        </div>

        {/* Right Metric Summary Matrix (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-3">
          <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">PRESENT WORKING DAYS</span>
            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-white">{presentDaysCount}</span>
              <span className="text-xs text-slate-400 font-mono ml-1">Days Logged</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Standard Attendance</span>
          </div>

          <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">TOTAL HOURS RECORDED</span>
            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-white">{totalMonthHours.toFixed(1)}h</span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono">{totalOvertimeHours > 0 ? `+${totalOvertimeHours.toFixed(1)}h OT Included` : 'Standard Hours'}</span>
          </div>

          <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">OVERTIME ACCUMULATED</span>
            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-purple-400">{totalOvertimeHours.toFixed(1)}h</span>
            </div>
            <span className="text-[10px] text-purple-300 font-mono">Past {attendancePolicy.standard_hours}h/day shift</span>
          </div>

          <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">REGULARIZATIONS</span>
            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {attendanceCorrections.filter((c) => c.employee_id === currentUser.id).length}
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">
              {attendanceCorrections.filter((c) => c.employee_id === currentUser.id && c.status === 'pending').length} pending review
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-logs" className="space-y-3">
        <TabsList className="bg-[#0c0e15] border border-[#1b202c] h-8 p-0.5">
          <TabsTrigger value="my-logs" className="text-xs font-mono h-7">My Timesheet Log</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="geo-map" className="text-xs font-mono h-7 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-400" /> Live Geo-Map Radar</TabsTrigger>}
          {isManagerOrAdmin && <TabsTrigger value="team-register" className="text-xs font-mono h-7">Live Squad Register</TabsTrigger>}
          {isManagerOrAdmin && <TabsTrigger value="corrections" className="text-xs font-mono h-7">Regularization Audits</TabsTrigger>}
        </TabsList>

        {/* Tab 1: My Timesheet */}
        <TabsContent value="my-logs">
          <div className="desktop-panel rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="desktop-table-header uppercase font-mono text-[10px] text-slate-400">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Clock In</th>
                  <th className="py-2 px-3">Clock Out</th>
                  <th className="py-2 px-3">Total Time</th>
                  <th className="py-2 px-3">Overtime</th>
                  <th className="py-2 px-3">Work Mode</th>
                  <th className="py-2 px-3">Punch In Location</th>
                  <th className="py-2 px-3">Punch Out Location</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Log Notes</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171b26]">
                {myAttendanceHistory.map((rec) => {
                  const stat = getStatusColor(rec.status);
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => setSelectedAttendanceLog(rec)}
                      className="desktop-table-row cursor-pointer text-slate-300 hover:bg-[#10141e] transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-medium text-slate-200">
                        {formatDate(rec.date, 'EEEE, dd MMM yyyy')}
                      </td>
                      <td className="py-2 px-3 font-mono">{formatTime(rec.clock_in)}</td>
                      <td className="py-2 px-3 font-mono">
                        {rec.clock_out ? formatTime(rec.clock_out) : 'In Progress'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-white">
                        {rec.total_hours ? `${rec.total_hours}h` : 'Active'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-400">
                        {rec.overtime_hours && rec.overtime_hours > 0 ? `+${rec.overtime_hours}h` : '—'}
                      </td>
                      <td className="py-2 px-3 uppercase font-mono text-[10px] text-slate-400">
                        {rec.work_mode}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-300 max-w-[150px] truncate" title={rec.punch_in_location || 'System Verified'}>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                          <span className="truncate">{rec.punch_in_location || 'Desktop Verified'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-400 max-w-[150px] truncate" title={rec.punch_out_location || '—'}>
                        {rec.punch_out_location ? (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                            <span className="truncate">{rec.punch_out_location}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${stat.text} ${stat.border}`}>
                          {rec.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 truncate max-w-[180px]">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAttendanceLog(rec);
                          }}
                          className="h-6.5 text-[10.5px] font-mono gap-1 px-2.5 border-[#222a3d] bg-[#121622] hover:bg-[#1a2133] text-slate-200"
                        >
                          <Eye className="h-3 w-3 text-blue-400" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 2: Live Geo-Map & Radar */}
        {isManagerOrAdmin && (
          <TabsContent value="geo-map">
            <GeoMapView 
              attendance={attendance} 
              profiles={profiles} 
              todayStr={todayStr} 
            />
          </TabsContent>
        )}

        {/* Tab 3: Live Squad Register */}
        {isManagerOrAdmin && (
          <TabsContent value="team-register">
            <div className="desktop-panel rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="desktop-table-header uppercase font-mono text-[10px] text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Designation</th>
                    <th className="py-2 px-3">Clock In</th>
                    <th className="py-2 px-3">Work Mode</th>
                    <th className="py-2 px-3">Punch Location</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171b26]">
                  {profiles.map((p) => {
                    const att = attendance.find((a) => a.employee_id === p.id && a.date === todayStr);
                    const isWorking = Boolean(att && !att.clock_out);
                    const isPresent = Boolean(att);

                    return (
                      <tr key={p.id} className="desktop-table-row text-slate-300">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar name={p.full_name} avatarUrl={p.avatar_url} size="sm" className="h-5 w-5 text-[9px]" />
                            <div>
                              <div className="font-medium text-slate-100">{p.full_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-400 capitalize">{p.role}</td>
                        <td className="py-2 px-3 font-mono">
                          {att?.clock_in ? formatTime(att.clock_in) : '--:--'}
                        </td>
                        <td className="py-2 px-3 uppercase font-mono text-[10px] text-slate-400">
                          {att?.work_mode || p.work_location}
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-300 max-w-[160px] truncate" title={att?.punch_in_location || 'Not clocked in'}>
                          {att?.punch_in_location ? (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                              <span className="truncate">{att.punch_in_location}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                              isWorking
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isPresent
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {isWorking ? 'WORKING' : isPresent ? 'OUT' : 'OFFLINE'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {att?.clock_in ? formatWorkingDuration(att.clock_in, att.clock_out) : '0h 0m'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {/* Tab 4: Corrections */}
        {isManagerOrAdmin && (
          <TabsContent value="corrections">
            <div className="desktop-panel rounded p-3">
              {attendanceCorrections.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No regularization audits pending.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceCorrections.map((corr) => {
                    const emp = profiles.find((p) => p.id === corr.employee_id);
                    return (
                      <div
                        key={corr.id}
                        className="flex items-center justify-between p-2.5 rounded bg-[#0c0e15] border border-[#1b202c] text-xs"
                      >
                        <div>
                          <span className="font-semibold text-white">{emp?.full_name}</span>
                          <span className="text-slate-400 font-mono ml-2">Date: {corr.date}</span>
                          <p className="text-slate-400 mt-0.5">{corr.reason}</p>
                        </div>
                        {corr.status === 'pending' ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                reviewAttendanceCorrection(corr.id, 'rejected', currentUser.id, 'Rejected');
                                toast.error('Rejected');
                              }}
                              className="text-[10px] bg-rose-600/20 text-rose-300 border border-rose-600/30 px-2 py-0.5 rounded"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                reviewAttendanceCorrection(corr.id, 'approved', currentUser.id, 'Approved');
                                toast.success('Approved');
                              }}
                              className="text-[10px] bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 px-2 py-0.5 rounded"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            {corr.status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Timesheet Record Full Details Modal */}
      {selectedAttendanceLog && (() => {
        const emp = profiles.find((p) => p.id === selectedAttendanceLog.employee_id || p.user_id === selectedAttendanceLog.employee_id) || currentUser;
        const stat = getStatusColor(selectedAttendanceLog.status);

        return (
          <Dialog open={Boolean(selectedAttendanceLog)} onOpenChange={() => setSelectedAttendanceLog(null)}>
            <DialogContent className="max-w-2xl bg-[#0c0f17] border-[#1f2637] p-6 shadow-2xl">
              <DialogHeader className="border-b border-[#1b2230] pb-3 pr-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      Timesheet Record Details
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="font-mono text-xs text-blue-400 font-semibold">
                      {formatDate(selectedAttendanceLog.date, 'dd MMM yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono uppercase rounded border font-bold ${stat.text} ${stat.border} ${stat.bg}`}>
                      {selectedAttendanceLog.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#141824] border border-[#232c3f] text-slate-300">
                      {selectedAttendanceLog.work_mode}
                    </span>
                  </div>
                </div>

                <DialogTitle className="text-base text-white mt-2 font-mono text-left">
                  {formatDate(selectedAttendanceLog.date, 'EEEE, dd MMMM yyyy')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Employee Profile Header Card */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0e121c] border border-[#1b2230]">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={emp?.full_name || 'Employee'} avatarUrl={emp?.avatar_url} size="md" className="h-9 w-9 text-xs" />
                    <div>
                      <div className="font-bold text-white text-sm">{emp?.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {emp?.designation_title || emp?.role?.replace('_', ' ').toUpperCase()} • {emp?.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-slate-400 block uppercase text-[9px]">Shift Policy</span>
                    <span className="text-slate-200">{attendancePolicy.office_start_time} - {attendancePolicy.office_end_time}</span>
                  </div>
                </div>

                {/* Timings & Working Hours Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#0e121c] p-3 rounded-lg border border-[#1b2230] font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Clock In</span>
                    <span className="text-white font-bold text-sm block">
                      {formatTime(selectedAttendanceLog.clock_in)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Clock Out</span>
                    <span className="text-white font-bold text-sm block">
                      {selectedAttendanceLog.clock_out ? formatTime(selectedAttendanceLog.clock_out) : 'Active / In Progress'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Total Duration</span>
                    <span className="text-blue-400 font-bold text-sm block">
                      {selectedAttendanceLog.total_hours ? `${selectedAttendanceLog.total_hours}h` : formatWorkingDuration(selectedAttendanceLog.clock_in, selectedAttendanceLog.clock_out)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Overtime</span>
                    <span className="text-purple-400 font-bold text-sm block">
                      {selectedAttendanceLog.overtime_hours && selectedAttendanceLog.overtime_hours > 0 ? `+${selectedAttendanceLog.overtime_hours}h` : '0h'}
                    </span>
                  </div>
                </div>

                {/* Geo-Location Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-[#0e121c] p-3 rounded-lg border border-[#1b2230] space-y-1">
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Punch In Location</span>
                    <div className="flex items-start gap-1.5 pt-0.5">
                      <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-slate-200 text-xs font-mono leading-relaxed break-words">
                        {selectedAttendanceLog.punch_in_location || 'Desktop Verified Location'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0e121c] p-3 rounded-lg border border-[#1b2230] space-y-1">
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Punch Out Location</span>
                    <div className="flex items-start gap-1.5 pt-0.5">
                      <MapPin className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-slate-200 text-xs font-mono leading-relaxed break-words">
                        {selectedAttendanceLog.punch_out_location || 'Pending shift punch-out'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Full Audit Notes */}
                <div className="bg-[#0e121c] p-3.5 rounded-lg border border-[#1b2230] space-y-1.5">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase">
                    System Audit Notes & Logs
                  </span>
                  <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[#090c13] p-2.5 rounded border border-[#171e2c]">
                    {selectedAttendanceLog.notes || 'Normal attendance logged with standard policy check.'}
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-[#1b2230] flex items-center justify-between sm:justify-between w-full mt-2">
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const dateStr = selectedAttendanceLog.date;
                      setSelectedAttendanceLog(null);
                      setCorrDate(dateStr);
                      setCorrectionModalOpen(true);
                    }}
                    className="h-8 text-xs border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono gap-1.5"
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                    <span>Request Regularization</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAttendanceLog(null)}
                  className="h-8 text-xs border-[#232c3f] bg-[#141824] font-mono text-slate-200 hover:bg-[#1a2130]"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Regularization Modal */}
      <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5">
          <DialogHeader>
            <DialogTitle className="text-base text-white">Attendance Regularization Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCorrectionSubmit} className="space-y-3 pt-2 text-xs">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Date</label>
              <Input type="date" value={corrDate} onChange={(e) => setCorrDate(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" required />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">In Time</label>
                <Input type="time" value={corrIn} onChange={(e) => setCorrIn(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" required />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Out Time</label>
                <Input type="time" value={corrOut} onChange={(e) => setCorrOut(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" required />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Reason</label>
              <Textarea
                placeholder="Explain the missed punch or timing issue..."
                value={corrReason}
                onChange={(e) => setCorrReason(e.target.value)}
                rows={2}
                className="mt-1 bg-[#0b0e14] border-[#1b202c] text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCorrectionModalOpen(false)} className="h-7 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs bg-blue-600">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
