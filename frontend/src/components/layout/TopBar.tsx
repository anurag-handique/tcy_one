import * as React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Clock,
  Play,
  Square,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Layers,
  CheckCheck,
  Building,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatWorkingDuration, formatRelativeTime } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { toast } from 'sonner';

export function TopBar() {
  const location = useLocation();
  const { currentUser, logout } = useAuthStore();
  const { setCommandPaletteOpen, setPunchModalOpen } = useUIStore();
  const { attendance, notifications, markNotificationAsRead, markAllNotificationsAsRead, profiles, departments } = useDataStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.find(
    (a) => a.employee_id === currentUser.id && a.date === todayStr
  );
  const isClockedIn = Boolean(todayAttendance && !todayAttendance.clock_out);

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

  const handleToggleAttendance = () => {
    setPunchModalOpen(true, isClockedIn ? 'out' : 'in');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'My Day Dashboard';
    if (path.startsWith('/tasks')) return 'Tasks & Kanban Board';
    if (path.startsWith('/attendance')) return 'Attendance & Timesheets';
    if (path.startsWith('/leave')) return 'Leave & Holidays';
    if (path.startsWith('/projects')) return 'Project Workspaces';
    if (path.startsWith('/standup')) return 'Daily Standup Sync';
    if (path.startsWith('/meetings')) return 'Meetings & Calendar';
    if (path.startsWith('/team')) return 'Team Directory';
    if (path.startsWith('/organization') || path.startsWith('/departments')) return 'Organization Structure';
    if (path.startsWith('/reports')) return 'Reports & Analytics';
    if (path.startsWith('/settings')) return 'System Settings';
    return 'Workspace';
  };

  const myNotifications = notifications.filter((n) => n.employee_id === currentUser?.id);
  const unreadNotifs = myNotifications.filter((n) => !n.is_read);

  return (
    <header className="flex h-12 w-full items-center justify-between border-b theme-border theme-surface-bg px-4 z-20 select-none">
      {/* Breadcrumb Path */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">Workspace</span>
        <span className="text-[#3b4356]">/</span>
        <span className="font-semibold text-slate-100">{getPageTitle()}</span>
      </div>

      {/* Center Search Pill */}
      <div className="flex-1 max-w-sm mx-4">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex h-6.5 w-full items-center justify-between rounded-none border border-[#212735] bg-[#121620] px-2 text-xs text-slate-400 hover:border-[#2f384c] hover:text-slate-200 transition-colors font-mono"
        >
          <div className="flex items-center gap-1.5">
            <Search className="h-3 w-3 text-slate-400" />
            <span className="text-[10px]">Type / to search or ⌘K</span>
          </div>
          <kbd className="rounded-none border border-[#262d3e] bg-[#171b26] px-1 py-0.2 font-mono text-[8px] text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2">
        {/* Attendance Punch Mini-Station */}
        <div className="flex items-center rounded-none border border-[#212735] bg-[#121620] px-1.5 py-0.5 gap-1.5">
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
            <Clock className="h-3 w-3 text-blue-400" />
            <span>{elapsed}</span>
          </div>
          <button
            onClick={handleToggleAttendance}
            className={`flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-none transition-colors ${
              isClockedIn
                ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-600/30'
                : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-600/30'
            }`}
          >
            {isClockedIn ? <Square className="h-2 w-2 fill-current" /> : <Play className="h-2 w-2 fill-current" />}
            <span>{isClockedIn ? 'Punch Out' : 'Punch In'}</span>
          </button>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-6.5 w-6.5 items-center justify-center rounded-none border border-[#212735] bg-[#121620] text-slate-400 hover:bg-[#181d29] hover:text-white transition-colors">
              <Bell className="h-3 w-3" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 min-w-3 px-0.5 items-center justify-center rounded-none bg-blue-600 text-[8px] font-bold text-white border border-blue-400/40">
                  {unreadNotifs.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-[#222837] bg-[#11141c] shadow-2xl p-0 rounded-none">
            <div className="flex items-center justify-between p-2 border-b border-[#1c2230]">
              <span className="text-xs font-semibold text-white">Notifications ({unreadNotifs.length})</span>
              {unreadNotifs.length > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead(currentUser.id)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[#1c2230]">
              {myNotifications.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-slate-400">No new alerts</div>
              ) : (
                myNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationAsRead(n.id)}
                    className={`p-2 text-xs hover:bg-[#171b26] cursor-pointer ${!n.is_read ? 'bg-blue-950/20' : ''}`}
                  >
                    <div className="flex items-center justify-between font-medium text-slate-200 mb-0.5">
                      <span>{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{formatRelativeTime(n.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Icon Only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full p-0 border border-[#283245] bg-[#121620] hover:border-blue-500/80 transition-all cursor-pointer select-none overflow-hidden ring-1 ring-blue-500/20"
              title={currentUser.full_name}
            >
              <UserAvatar name={currentUser.full_name} avatarUrl={currentUser.avatar_url} size="sm" className="h-full w-full text-[10px] rounded-full" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-[#222837] bg-[#11141c] p-3 shadow-2xl space-y-2.5 rounded-none">
            {/* Header: Centered Avatar & Full Name */}
            <div className="flex flex-col items-center text-center pb-2.5 border-b border-[#1c2230]">
              <UserAvatar
                name={currentUser.full_name}
                avatarUrl={currentUser.avatar_url}
                size="lg"
                className="h-12 w-12 text-sm mb-2 ring-2 ring-blue-500/40 rounded-full"
              />
              <div className="font-bold text-xs text-white leading-tight">
                {currentUser.full_name}
              </div>
              <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                @{currentUser.email ? currentUser.email.split('@')[0] : 'user'}
              </div>
            </div>

            {/* User Details in Clean Separate Lines */}
            <div className="space-y-2 text-xs bg-[#0b0e14] p-2.5 border border-[#1b212f]">
              <div className="flex flex-col space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                  Username
                </span>
                <span className="text-slate-200 font-mono text-[11px]">
                  {currentUser.email ? currentUser.email.split('@')[0] : '—'}
                </span>
              </div>

              <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                  Email Address
                </span>
                <span className="text-slate-200 font-mono text-[11px] break-all leading-snug">
                  {currentUser.email || '—'}
                </span>
              </div>

              <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                  System Role
                </span>
                <div className="pt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-none text-[9px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800/50 font-mono">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {currentUser.phone && (
                <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                    Phone Number
                  </span>
                  <span className="text-slate-200 font-mono text-[11px]">
                    {currentUser.phone}
                  </span>
                </div>
              )}

              {currentUser.designation_title && (
                <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                    Designation
                  </span>
                  <span className="text-slate-200 text-[11px] leading-snug">
                    {currentUser.designation_title}
                  </span>
                </div>
              )}

              {currentUser.department_id && (() => {
                const dept = departments.find((d) => d.id === currentUser.department_id);
                return dept ? (
                  <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                      Department
                    </span>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-none text-[9px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/50 font-mono">
                        {dept.code}
                      </span>
                      <span className="text-slate-200 text-[11px]">{dept.name}</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <DropdownMenuSeparator className="bg-[#1c2230] my-1.5" />

            {/* Centered Logout Button */}
            <div className="pt-0.5 flex justify-center">
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  toast.success('Signed out successfully');
                }}
                className="w-full text-xs py-1.5 rounded-none cursor-pointer flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 font-semibold transition-all duration-150 text-center font-mono"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
