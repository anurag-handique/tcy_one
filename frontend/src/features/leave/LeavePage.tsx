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
  Search,
  Trash2,
  Edit2,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { UserAvatar } from '@/components/ui/Avatar';
import { Holiday } from '@/types';
import { toast } from 'sonner';

export function LeavePage() {
  const { currentUser, activeRole } = useAuthStore();
  const {
    leaveRequests,
    leaveTypes,
    holidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    reviewLeaveRequest,
    profiles,
    attendancePolicy,
  } = useDataStore();
  const { setLeaveModalOpen } = useUIStore();

  const isSuperAdminOrAdmin = activeRole === 'super_admin' || activeRole === 'admin';
  const isManagerOrAdmin = activeRole === 'manager' || isSuperAdminOrAdmin;

  const myLeaves = leaveRequests.filter((l) => l.employee_id === currentUser.id);
  const pendingManagerApprovals = leaveRequests.filter((l) => l.status === 'pending');

  const leaveIcons: Record<string, any> = {
    CL: Sun,
    SL: HeartPulse,
    EL: Plane,
    CO: Coffee,
  };

  const activeOverrides = attendancePolicy.working_saturdays_override || [];

  // Holiday Management State (Admin / Super Admin)
  const [holidaySearch, setHolidaySearch] = React.useState('');
  const [holidayModalOpen, setHolidayModalOpen] = React.useState(false);
  const [editingHoliday, setEditingHoliday] = React.useState<Holiday | null>(null);
  const [holidayName, setHolidayName] = React.useState('');
  const [holidayDate, setHolidayDate] = React.useState('');
  const [holidayDesc, setHolidayDesc] = React.useState('');
  const [holidayOptional, setHolidayOptional] = React.useState(false);
  const [isSubmittingHoliday, setIsSubmittingHoliday] = React.useState(false);

  const openAddHolidayModal = () => {
    setEditingHoliday(null);
    setHolidayName('');
    setHolidayDate(new Date().toISOString().split('T')[0]);
    setHolidayDesc('');
    setHolidayOptional(false);
    setHolidayModalOpen(true);
  };

  const openEditHolidayModal = (h: Holiday) => {
    setEditingHoliday(h);
    setHolidayName(h.name);
    setHolidayDate(h.holiday_date);
    setHolidayDesc(h.description || '');
    setHolidayOptional(Boolean(h.is_optional));
    setHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim()) {
      toast.error('Holiday name is required');
      return;
    }
    if (!holidayDate) {
      toast.error('Holiday date is required');
      return;
    }

    setIsSubmittingHoliday(true);
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, {
          name: holidayName.trim(),
          holiday_date: holidayDate,
          description: holidayDesc.trim() || undefined,
          is_optional: holidayOptional,
          year: new Date(holidayDate).getFullYear() || 2026,
        });
        toast.success(`Holiday "${holidayName}" updated successfully`);
      } else {
        await addHoliday({
          name: holidayName.trim(),
          holiday_date: holidayDate,
          description: holidayDesc.trim() || undefined,
          is_optional: holidayOptional,
          year: new Date(holidayDate).getFullYear() || 2026,
        });
        toast.success(`Holiday "${holidayName}" added to company calendar`);
      }
      setHolidayModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save holiday');
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (h: Holiday) => {
    if (window.confirm(`Are you sure you want to remove "${h.name}" from official holidays?`)) {
      await deleteHoliday(h.id);
      toast.success(`Holiday "${h.name}" deleted`);
    }
  };

  const filteredHolidays = React.useMemo(() => {
    const q = holidaySearch.toLowerCase().trim();
    if (!q) return holidays;
    return holidays.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.holiday_date.includes(q) ||
        h.description?.toLowerCase().includes(q)
    );
  }, [holidays, holidaySearch]);

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

          {/* Official Company Holidays Header & Controls */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-slate-300 font-bold tracking-wider block">
                  Official 2026 Gazetted & Company Holidays
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  {holidays.length} Days
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter holidays..."
                    value={holidaySearch}
                    onChange={(e) => setHolidaySearch(e.target.value)}
                    className="w-full h-7.5 bg-[#0e121a] border border-[#1b202c] rounded-full pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Add Holiday Button (Super Admin / Admin only) */}
                {isSuperAdminOrAdmin && (
                  <Button
                    size="sm"
                    onClick={openAddHolidayModal}
                    className="h-7.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 rounded-full gap-1 shadow-sm shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Holiday</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Holiday Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredHolidays.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-xs text-slate-500 font-mono rounded-lg border border-[#1b202c] bg-[#0c0e15]">
                  No holidays match your search filter.
                </div>
              ) : (
                filteredHolidays.map((h) => (
                  <div key={h.id} className="desktop-panel rounded-lg p-3 flex items-center justify-between group hover:border-[#2a3449] transition-colors">
                    <div className="space-y-1 pr-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{h.name}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold shrink-0 ${
                            h.is_optional
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {h.is_optional ? 'OPTIONAL' : 'OFFICIAL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{h.description || 'Gazetted Company Holiday'}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-blue-400 block">{formatDate(h.holiday_date, 'dd MMM')}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{formatDate(h.holiday_date, 'EEEE')}</span>
                      </div>

                      {/* Admin Controls */}
                      {isSuperAdminOrAdmin && (
                        <div className="flex items-center gap-1 pl-2 border-l border-[#1b202c]">
                          <button
                            onClick={() => openEditHolidayModal(h)}
                            title="Edit Holiday"
                            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(h)}
                            title="Delete Holiday"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Admin Add / Edit Holiday Modal */}
      {isSuperAdminOrAdmin && (
        <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
          <DialogContent className="max-w-md bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#21262d] pr-8">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold text-white">
                    {editingHoliday ? 'Edit Company Holiday' : 'Add Official Holiday'}
                  </DialogTitle>
                  <p className="text-[11px] text-slate-400">
                    Managed by Super Admin & Administrative team
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-3.5 pt-2 text-xs">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Holiday Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Independence Day / Diwali"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Holiday Date <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Holiday Classification
                  </label>
                  <select
                    value={holidayOptional ? 'optional' : 'official'}
                    onChange={(e) => setHolidayOptional(e.target.value === 'optional')}
                    className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="official">Official / Gazetted</option>
                    <option value="optional">Optional / Restricted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Description / Remarks (Optional)
                </label>
                <Textarea
                  placeholder="Brief description of the holiday..."
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  rows={2}
                  className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHolidayModalOpen(false)}
                  className="h-8 text-xs border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingHoliday}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 shadow-sm"
                >
                  {editingHoliday ? 'Update Holiday' : 'Save & Publish Holiday'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

