import * as React from 'react';
import {
  Sun,
  Clock,
  CheckCircle2,
  Calendar,
  Video,
  AlertTriangle,
  Plus,
  Play,
  Square,
  Sparkles,
  Users,
  Check,
  X,
  ExternalLink,
  Flame,
  ShieldCheck,
  Building,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatTime, formatDate, formatWorkingDuration, getPriorityColor, getStatusColor } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { UserAvatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';

export function MyDayPage() {
  const { currentUser, activeRole } = useAuthStore();
  const {
    attendance,
    clockIn,
    clockOut,
    tasks,
    updateTaskStatus,
    standups,
    standupResponses,
    meetings,
    leaveRequests,
    leaveTypes,
    reviewLeaveRequest,
    profiles,
    createTask,
    holidays,
    attendancePolicy,
  } = useDataStore();

  const { setTaskModalOpen, setStandupModalOpen, setLeaveModalOpen, setMeetingModalOpen, setPunchModalOpen } = useUIStore();

  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || activeRole === 'super_admin';

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.find(
    (a) => a.employee_id === currentUser.id && a.date === todayStr
  );
  const isClockedIn = Boolean(todayAttendance && !todayAttendance.clock_out);

  const handlePunchToggle = () => {
    setPunchModalOpen(true, isClockedIn ? 'out' : 'in');
  };

  const myTasks = tasks.filter((t) => t.assignee_id === currentUser.id);
  const myCompletedTasks = myTasks.filter((t) => t.status === 'done');
  const myPendingTasks = myTasks.filter((t) => t.status !== 'done');
  const taskProgressPercent = myTasks.length > 0 ? Math.round((myCompletedTasks.length / myTasks.length) * 100) : 0;

  const todayStandup = standups[0];
  const myStandupResponse = standupResponses.find(
    (r) => r.standup_id === todayStandup?.id && r.employee_id === currentUser.id
  );

  const todayMeetings = meetings.filter((m) => {
    return m.start_time.startsWith(todayStr) || new Date(m.start_time).toDateString() === new Date().toDateString();
  });

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');

  const handleConvertBlockerToTask = (blockerText: string, employeeName: string) => {
    createTask({
      title: `[Unblock] ${blockerText.slice(0, 50)}...`,
      description: `Reported by ${employeeName}: "${blockerText}"`,
      project_id: tasks[0]?.project_id || '',
      assignee_id: currentUser.id,
      reporter_id: currentUser.id,
      priority: 'urgent',
      status: 'todo',
      due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
      estimated_hours: 2,
      actual_hours: 0,
      tags: ['Blocker', 'StandupAction'],
    });
    toast.success('Blocker converted to assigned task');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">
              My Day Cockpit
            </h1>
            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
              {formatDate(new Date(), 'EEEE, dd MMM yyyy')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active daily workspace for {currentUser.full_name} ({currentUser.role.replace('_', ' ')})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStandupModalOpen(true)}
            className="h-7 text-xs border-[#222837] bg-[#12151e] hover:bg-[#181d28] gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>{myStandupResponse ? 'Edit Standup' : 'Submit Standup'}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setTaskModalOpen(true)}
            className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Attendance */}
        <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>ATTENDANCE</span>
            <div className="flex items-center gap-1">
              {todayAttendance && todayAttendance.overtime_hours && todayAttendance.overtime_hours > 0 ? (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  +{todayAttendance.overtime_hours}h OT
                </span>
              ) : null}
              <Clock className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </div>
          <div className="my-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {todayAttendance?.clock_in
                ? formatWorkingDuration(todayAttendance.clock_in, todayAttendance.clock_out)
                : '0h 0m'}
            </span>
            <button
              onClick={handlePunchToggle}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors ${
                isClockedIn
                  ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border-rose-600/30'
                  : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border-emerald-600/30'
              }`}
            >
              {isClockedIn ? 'Punch Out' : 'Punch In'}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-[#1a1f2b] font-mono">
            <span>Shift: {attendancePolicy.office_start_time} - {attendancePolicy.office_end_time}</span>
            <span>In: {todayAttendance?.clock_in ? formatTime(todayAttendance.clock_in) : '--:--'}</span>
          </div>
        </div>

        {/* Card 2: Tasks */}
        <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>MY WORKLOAD</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {myCompletedTasks.length} / {myTasks.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {myPendingTasks.length} pending
            </span>
          </div>
          <div className="space-y-1 pt-1 border-t border-[#1a1f2b]">
            <Progress value={taskProgressPercent} indicatorColor="bg-emerald-500" className="h-1.5" />
          </div>
        </div>

        {/* Card 3: Meetings */}
        <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>SYNCS TODAY</span>
            <Video className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {todayMeetings.length}
            </span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
              {todayMeetings.length > 0 ? 'SCHEDULED' : 'CLEAR'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-[#1a1f2b]">
            {todayMeetings[0] ? `${todayMeetings[0].title} (${formatTime(todayMeetings[0].start_time)})` : 'No syncs today'}
          </div>
        </div>

        {/* Card 4: Leave Quota */}
        <div className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>LEAVE BALANCE</span>
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">12 Days</span>
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="text-[10px] font-mono text-amber-400 hover:underline"
            >
              + Apply
            </button>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-[#1a1f2b]">
            <span>{holidays[0] ? `Next: ${holidays[0].name} (${formatDate(holidays[0].holiday_date, 'MMM dd')})` : 'Official 2026 Calendar'}</span>
            <span className="text-emerald-400 font-mono font-medium">{holidays.length > 0 ? 'Holiday' : 'Standard'}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left Assigned Tasks (7 cols) + Right Standup & Meetings (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Task Queue */}
        <div className="lg:col-span-7 desktop-panel rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1b202c] bg-[#0c0e15]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Assigned Work Queue
              </span>
              <span className="text-[10px] font-mono bg-[#1b202c] px-1.5 py-0.2 rounded text-slate-300">
                {myTasks.length}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaskModalOpen(true)}
              className="h-6 text-[11px] px-2 border-[#262c3b] bg-[#12151e]"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="divide-y divide-[#171b26] p-2 space-y-1">
            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active tasks assigned.
              </div>
            ) : (
              myTasks.map((task) => {
                const isDone = task.status === 'done';
                const prio = getPriorityColor(task.priority);
                const stat = getStatusColor(task.status);

                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-[#141822] transition-colors ${
                      isDone ? 'opacity-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => updateTaskStatus(task.id, isDone ? 'todo' : 'done')}
                      className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                        isDone
                          ? 'border-emerald-500 bg-emerald-600 text-slate-950'
                          : 'border-[#2d3648] hover:border-blue-500'
                      }`}
                    >
                      {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {task.title}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded border uppercase ${prio.bg}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>Due {formatDate(task.due_date, 'dd MMM')}</span>
                        <span>•</span>
                        <span>{task.estimated_hours}h est</span>
                      </div>
                    </div>

                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                      className={`h-6 text-[10px] rounded border bg-[#0e1118] px-1.5 font-mono ${stat.text} ${stat.border}`}
                    >
                      <option value="todo">TODO</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="review">REVIEW</option>
                      <option value="done">DONE</option>
                    </select>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Standup & Meetings */}
        <div className="lg:col-span-5 space-y-4">
          {/* Standup Checkpoint */}
          <div className="desktop-panel rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1b202c] bg-[#0c0e15]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Standup Sync
                </span>
              </div>
              <button
                onClick={() => setStandupModalOpen(true)}
                className="text-[10px] font-mono text-blue-400 hover:underline"
              >
                {myStandupResponse ? 'Edit' : 'Submit'}
              </button>
            </div>

            <div className="p-3 text-xs">
              {myStandupResponse ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      Yesterday:
                    </span>
                    <p className="bg-[#0b0e14] p-2 rounded border border-[#1b202c] text-slate-300 text-[11px]">
                      {myStandupResponse.yesterday_work}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      Today's Focus:
                    </span>
                    <p className="bg-[#0b0e14] p-2 rounded border border-[#1b202c] text-slate-300 text-[11px]">
                      {myStandupResponse.today_plan}
                    </p>
                  </div>
                  {myStandupResponse.blockers && myStandupResponse.blockers !== 'None' && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded text-rose-300 text-[11px]">
                      <span className="font-bold block mb-0.5">Blocker:</span>
                      {myStandupResponse.blockers}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-slate-400">No standup entry logged yet today.</p>
                  <Button
                    size="sm"
                    onClick={() => setStandupModalOpen(true)}
                    className="h-6 text-xs bg-blue-600 text-white"
                  >
                    Post Standup
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Today's Meetings */}
          <div className="desktop-panel rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1b202c] bg-[#0c0e15]">
              <div className="flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Syncs Schedule
                </span>
              </div>
              <button
                onClick={() => setMeetingModalOpen(true)}
                className="text-[10px] font-mono text-blue-400 hover:underline"
              >
                + Schedule
              </button>
            </div>

            <div className="p-2 space-y-1.5 text-xs">
              {todayMeetings.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center font-mono">
                  Calendar clear for deep work.
                </p>
              ) : (
                todayMeetings.map((m) => (
                  <div key={m.id} className="p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs">{m.title}</span>
                      <span className="font-mono text-[10px] text-blue-400">
                        {formatTime(m.start_time)}
                      </span>
                    </div>
                    {m.meeting_url && (
                      <a
                        href={m.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline mt-1"
                      >
                        <span>Join Call</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Manager Command Overview (When Role is Manager/Admin) */}
      {isManagerOrAdmin && (
        <div className="desktop-panel rounded-lg p-3 space-y-3 mt-4">
          <div className="flex items-center gap-2 border-b border-[#1b202c] pb-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-200">
              Squad Management Overview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Squad Attendance Matrix */}
            <div className="p-2.5 rounded bg-[#0c0e15] border border-[#1b202c] space-y-2">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                Live Squad Attendance
              </span>
              <div className="space-y-1">
                {profiles.map((p) => {
                  const att = attendance.find((a) => a.employee_id === p.id && a.date === todayStr);
                  const isPresent = Boolean(att);
                  const isWorking = Boolean(att && !att.clock_out);

                  return (
                    <div key={p.id} className="flex items-center justify-between text-[11px] py-0.5">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={p.full_name} avatarUrl={p.avatar_url} size="sm" className="h-4 w-4 text-[8px]" />
                        <span className="text-slate-200">{p.full_name}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                          isWorking
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isPresent
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isWorking ? 'WORKING' : isPresent ? 'OUT' : 'OFFLINE'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="p-2.5 rounded bg-[#0c0e15] border border-[#1b202c] space-y-2">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                Leave Approvals ({pendingLeaves.length})
              </span>
              {pendingLeaves.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No pending leave applications.</p>
              ) : (
                pendingLeaves.map((req) => {
                  const applicant = profiles.find((p) => p.id === req.employee_id);
                  return (
                    <div key={req.id} className="p-2 rounded bg-[#11141c] border border-[#1b202c] text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{applicant?.full_name}</span>
                        <span className="text-amber-400 font-mono">{req.total_days}d</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">{req.reason}</p>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            reviewLeaveRequest(req.id, 'rejected', currentUser.id, 'Rejected');
                            toast.error('Rejected');
                          }}
                          className="text-[9px] bg-rose-600/20 text-rose-300 border border-rose-600/30 px-2 py-0.5 rounded"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            reviewLeaveRequest(req.id, 'approved', currentUser.id, 'Approved');
                            toast.success('Approved');
                          }}
                          className="text-[9px] bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 px-2 py-0.5 rounded"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Active Blockers */}
            <div className="p-2.5 rounded bg-[#0c0e15] border border-[#1b202c] space-y-2">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                Active Blocker Triage
              </span>
              {standupResponses
                .filter((r) => r.blockers && r.blockers !== 'None')
                .map((r) => {
                  const emp = profiles.find((p) => p.id === r.employee_id);
                  return (
                    <div key={r.id} className="p-2 rounded bg-rose-500/5 border border-rose-500/20 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-300">{emp?.full_name}</span>
                        <span className="text-[9px] font-mono text-rose-400">FLAGGED</span>
                      </div>
                      <p className="text-slate-300 text-[10px]">{r.blockers}</p>
                      <button
                        onClick={() => handleConvertBlockerToTask(r.blockers || '', emp?.full_name || '')}
                        className="text-[9px] w-full font-mono bg-[#161a24] hover:bg-[#1e2430] border border-[#262d3e] text-slate-200 py-1 rounded"
                      >
                        Convert to Action Task
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
