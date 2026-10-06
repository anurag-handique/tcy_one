import * as React from 'react';
import {
  CalendarDays,
  Plus,
  Sun,
  HeartPulse,
  Plane,
  Coffee,
  Check,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { UserAvatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';

export function LeavePage() {
  const { currentUser, activeRole } = useAuthStore();
  const { leaveRequests, leaveTypes, holidays, reviewLeaveRequest, profiles, attendancePolicy } = useDataStore();
  const { setLeaveModalOpen } = useUIStore();

  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || activeRole === 'super_admin';

  const myLeaves = leaveRequests.filter((l) => l.employee_id === currentUser.id);
  const pendingManagerApprovals = leaveRequests.filter((l) => l.status === 'pending');

  const leaveIcons: Record<string, any> = {
    CL: Sun,
    SL: HeartPulse,
    EL: Plane,
    CO: Coffee,
  };

  const activeOverrides = attendancePolicy.working_saturdays_override || [];

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight font-mono">
            LEAVE ENTITLEMENTS & HOLIDAYS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Annual leave quotas, manager approval queues, and official 2026 holiday calendar.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setLeaveModalOpen(true)}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* Quotas Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {leaveTypes.map((type) => {
          const Icon = leaveIcons[type.code] || CalendarDays;
          const used = myLeaves
            .filter((l) => l.leave_type_id === type.id && l.status === 'approved')
            .reduce((acc, curr) => acc + curr.total_days, 0);
          const balance = Math.max(0, type.default_days - used);

          return (
            <div key={type.id} className="desktop-panel rounded-lg p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{type.name.toUpperCase()} ({type.code})</span>
                <Icon className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div className="my-2">
                <span className="text-3xl font-bold font-mono text-white">{balance}</span>
                <span className="text-xs text-slate-400 font-mono ml-1">/ {type.default_days} DAYS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex justify-between pt-1 border-t border-[#1a1f2b]">
                <span>{used}d utilized</span>
                <span className="text-emerald-400">PAID</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-leaves" className="space-y-3">
        <TabsList className="bg-[#0c0e15] border border-[#1b202c] h-8 p-0.5">
          <TabsTrigger value="my-leaves" className="text-xs font-mono h-7">My Leave Applications</TabsTrigger>
          {isManagerOrAdmin && (
            <TabsTrigger value="approvals" className="text-xs font-mono h-7 gap-1.5">
              <span>Approval Queue</span>
              {pendingManagerApprovals.length > 0 && (
                <span className="bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded text-[10px]">
                  {pendingManagerApprovals.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="holidays" className="text-xs font-mono h-7">2026 Company Holidays</TabsTrigger>
        </TabsList>

        {/* Tab 1: My Leaves */}
        <TabsContent value="my-leaves">
          <div className="desktop-panel rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="desktop-table-header uppercase font-mono text-[10px] text-slate-400">
                <tr>
                  <th className="py-2 px-3">Leave Category</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Days</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Approver Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171b26]">
                {myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs font-mono">
                      No leave applications found.
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((req) => {
                    const lType = leaveTypes.find((t) => t.id === req.leave_type_id);
                    const stat = getStatusColor(req.status);

                    return (
                      <tr key={req.id} className="desktop-table-row text-slate-300">
                        <td className="py-2 px-3 font-semibold text-white">
                          {lType?.name} ({lType?.code})
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-200">
                          {formatDate(req.start_date)} → {formatDate(req.end_date)}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-white">
                          {req.total_days}d
                        </td>
                        <td className="py-2 px-3 text-slate-300 max-w-[250px] truncate">
                          {req.reason}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${stat.text} ${stat.border}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {req.approver_note || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 2: Approvals Queue */}
        {isManagerOrAdmin && (
          <TabsContent value="approvals">
            <div className="desktop-panel rounded p-3 space-y-2">
              {pendingManagerApprovals.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center font-mono">
                  All requests processed.
                </p>
              ) : (
                pendingManagerApprovals.map((req) => {
                  const applicant = profiles.find((p) => p.id === req.employee_id);
                  const lType = leaveTypes.find((t) => t.id === req.leave_type_id);

                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded bg-[#0c0e15] border border-[#1b202c] text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar name={applicant?.full_name || 'Team Member'} avatarUrl={applicant?.avatar_url} size="sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{applicant?.full_name}</span>
                            <span className="text-[10px] font-mono text-blue-400">
                              {lType?.code} ({req.total_days}d)
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-0.5">{req.reason}</p>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatDate(req.start_date)} to {formatDate(req.end_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            reviewLeaveRequest(req.id, 'rejected', currentUser.id, 'Rejected by manager');
                            toast.error('Rejected');
                          }}
                          className="text-[10px] bg-rose-600/20 text-rose-300 border border-rose-600/30 px-2.5 py-1 rounded font-mono"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            reviewLeaveRequest(req.id, 'approved', currentUser.id, 'Approved by manager');
                            toast.success('Approved');
                          }}
                          className="text-[10px] bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 px-2.5 py-1 rounded font-mono"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        )}

        {/* Tab 3: Holidays & Saturday Schedule */}
        <TabsContent value="holidays" className="space-y-3">
          {/* Saturday Policy Summary Banner */}
          <div className="desktop-panel rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-blue-950/40 bg-[#0e121a]">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Saturday Schedule Policy: {attendancePolicy.saturday_off_rule === '3rd_4th' ? '3rd & 4th Saturdays OFF' : attendancePolicy.saturday_off_rule === '2nd_4th' ? '2nd & 4th Saturdays OFF' : attendancePolicy.saturday_off_rule === 'all' ? 'All Saturdays OFF' : 'All Saturdays Working'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  1st, 2nd, and 5th Saturdays are regular working days unless declared off.
                </span>
              </div>
            </div>
            {activeOverrides.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold self-start sm:self-auto">
                {activeOverrides.length} Urgent Work Saturday(s) Active
              </span>
            )}
          </div>

          {/* Active Working Saturday Overrides (if any) */}
          {activeOverrides.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-purple-400 font-bold tracking-wider block">
                Urgent Working Saturdays (Enabled by Super Admin)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeOverrides.map((dateStr) => (
                  <div
                    key={dateStr}
                    className="desktop-panel rounded-lg p-2.5 flex items-center justify-between border-purple-500/30 bg-purple-950/10"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs font-mono">
                          {formatDate(dateStr, 'dd MMMM yyyy')}
                        </span>
                        <span className="text-[9px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30 uppercase font-bold">
                          URGENT WORKDAY
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Active shift — standard punch-in and attendance expected.
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-purple-400 block">{formatDate(dateStr, 'dd MMM')}</span>
                      <span className="text-[10px] text-slate-400 uppercase">Saturday</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Company Holidays */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
              Official 2026 Gazetted Holidays
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {holidays.map((h) => (
                <div key={h.id} className="desktop-panel rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{h.name}</span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 uppercase">
                        OFFICIAL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{h.description}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-blue-400 block">{formatDate(h.holiday_date, 'dd MMM')}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{formatDate(h.holiday_date, 'EEEE')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
