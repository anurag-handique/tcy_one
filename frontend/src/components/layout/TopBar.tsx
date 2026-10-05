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
  const { setCommandPaletteOpen } = useUIStore();
  const { attendance, clockIn, clockOut, notifications, markNotificationAsRead, markAllNotificationsAsRead, profiles } = useDataStore();

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
    if (isClockedIn) {
      clockOut(currentUser.id);
      toast.success(`Clocked out at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } else {
      clockIn(currentUser.id, 'office', 'Desktop clock-in');
      toast.success(`Clocked in! Active timecard recording.`);
    }
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
    if (path.startsWith('/reports')) return 'Reports & Analytics';
    if (path.startsWith('/settings')) return 'System Settings';
    return 'Workspace';
  };

  const myNotifications = notifications.filter((n) => n.employee_id === currentUser.id);
  const unreadNotifs = myNotifications.filter((n) => !n.is_read);

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-[#1b202c] bg-[#0e1118] px-4 z-20 select-none">
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
          className="flex h-7 w-full items-center justify-between rounded border border-[#212735] bg-[#121620] px-2.5 text-xs text-slate-400 hover:border-[#2f384c] hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px]">Type / to search or ⌘K for actions</span>
          </div>
          <kbd className="rounded border border-[#262d3e] bg-[#171b26] px-1 py-0.2 font-mono text-[9px] text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2.5">
        {/* Attendance Punch Mini-Station */}
        <div className="flex items-center rounded border border-[#212735] bg-[#121620] px-2 py-0.5 gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
            <Clock className="h-3 w-3 text-blue-400" />
            <span>{elapsed}</span>
          </div>
          <button
            onClick={handleToggleAttendance}
            className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors ${
              isClockedIn
                ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-600/30'
                : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-600/30'
            }`}
          >
            {isClockedIn ? <Square className="h-2.5 w-2.5 fill-current" /> : <Play className="h-2.5 w-2.5 fill-current" />}
            <span>{isClockedIn ? 'Punch Out' : 'Punch In'}</span>
          </button>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-7 w-7 items-center justify-center rounded border border-[#212735] bg-[#121620] text-slate-400 hover:bg-[#181d29] hover:text-white transition-colors">
              <Bell className="h-3.5 w-3.5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                  {unreadNotifs.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-[#222837] bg-[#11141c] shadow-2xl p-0">
            <div className="flex items-center justify-between p-2.5 border-b border-[#1c2230]">
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
                <div className="py-5 text-center text-xs text-slate-400">No new alerts</div>
              ) : (
                myNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationAsRead(n.id)}
                    className={`p-2.5 text-xs hover:bg-[#171b26] cursor-pointer ${!n.is_read ? 'bg-blue-950/20' : ''}`}
                  >
                    <div className="flex items-center justify-between font-medium text-slate-200 mb-0.5">
                      <span>{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{formatRelativeTime(n.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{n.message}</p>
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
              className="flex h-7 w-7 items-center justify-center rounded-full p-0 border border-[#242c3d] bg-[#121620] hover:border-blue-500/60 hover:ring-2 hover:ring-blue-500/20 transition-all cursor-pointer select-none"
              title={currentUser.full_name}
            >
              <UserAvatar name={currentUser.full_name} avatarUrl={currentUser.avatar_url} size="sm" className="h-6 w-6 text-[10px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-[#222837] bg-[#11141c] p-4 shadow-2xl space-y-3">
            {/* Header: Centered Avatar & Full Name */}
            <div className="flex flex-col items-center text-center pb-3 border-b border-[#1c2230]">
              <UserAvatar
                name={currentUser.full_name}
                avatarUrl={currentUser.avatar_url}
                size="lg"
                className="h-14 w-14 text-base mb-2.5 ring-2 ring-blue-500/40 shadow-lg"
              />
              <div className="font-bold text-sm text-white leading-tight">
                {currentUser.full_name}
              </div>
              <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                @{currentUser.email ? currentUser.email.split('@')[0] : 'user'}
              </div>
            </div>

            {/* User Details in Clean Separate Lines */}
            <div className="space-y-2.5 text-xs bg-[#0b0e14] p-3 rounded-lg border border-[#1b212f]">
              <div className="flex flex-col space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Username
                </span>
                <span className="text-slate-200 font-mono text-[12px]">
                  {currentUser.email ? currentUser.email.split('@')[0] : '—'}
                </span>
              </div>

              <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Email Address
                </span>
                <span className="text-slate-200 font-mono text-[12px] break-all leading-snug">
                  {currentUser.email || '—'}
                </span>
              </div>

              <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  System Role
                </span>
                <div className="pt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800/50">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {currentUser.phone && (
                <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Phone Number
                  </span>
                  <span className="text-slate-200 font-mono text-[12px]">
                    {currentUser.phone}
                  </span>
                </div>
              )}
            </div>

            <DropdownMenuSeparator className="bg-[#1c2230] my-2" />

            {/* Centered Logout Button */}
            <div className="pt-1 flex justify-center">
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  toast.success('Signed out successfully');
                }}
                className="w-full text-xs py-2 rounded-md cursor-pointer flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 font-semibold transition-all duration-150 text-center"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
