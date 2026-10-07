import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  CheckCircle2,
  Building,
  Monitor,
  Calendar,
  MessageSquare,
  Video,
  Info,
  Coffee,
  Download,
  Laptop,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatWorkingDuration, formatRelativeTime } from '@/lib/utils';
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
} from '@/lib/desktopNotification';
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
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { setCommandPaletteOpen, setPunchModalOpen } = useUIStore();
  const { isInstallable, installApp } = usePWAInstall();
  const { attendance, notifications, markNotificationAsRead, markAllNotificationsAsRead, profiles, departments, designations, startBreak, endBreak } = useDataStore();


  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission>(getDesktopNotificationPermission());

  const handleRequestPermission = async () => {
    const res = await requestDesktopNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      toast.success('System desktop notifications enabled (Windows & macOS)');
    } else if (res === 'denied') {
      toast.error('System notifications were blocked in your browser settings.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.find(
    (a) => a.employee_id === currentUser.id && a.date === todayStr
  );
  const isClockedIn = Boolean(todayAttendance && !todayAttendance.clock_out);
  const isShiftCompleted = Boolean(todayAttendance?.clock_in && todayAttendance?.clock_out);
  const isOnBreak = Boolean(isClockedIn && todayAttendance?.break_start);

  const [elapsed, setElapsed] = React.useState<string>('0h 0m');
  const [breakElapsed, setBreakElapsed] = React.useState<string>('0m');

  React.useEffect(() => {
    const update = () => {
      if (todayAttendance?.clock_in && !todayAttendance.clock_out) {
        setElapsed(formatWorkingDuration(todayAttendance.clock_in, null));
      } else if (todayAttendance?.clock_in && todayAttendance.clock_out) {
        setElapsed(formatWorkingDuration(todayAttendance.clock_in, todayAttendance.clock_out));
      } else {
        setElapsed('0h 0m');
      }

      if (todayAttendance?.break_start) {
        const breakMins = Math.max(1, Math.floor((new Date().getTime() - new Date(todayAttendance.break_start).getTime()) / 60000));
        setBreakElapsed(`${breakMins}m`);
      }
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [todayAttendance]);

  const handleToggleAttendance = () => {
    if (isShiftCompleted) {
      toast.info('Shift completed for today. Submit an Attendance Regularization request if you need timing adjustments.');
      return;
    }
    setPunchModalOpen(true, isClockedIn ? 'out' : 'in');
  };

  const handleStartBreak = () => {
    startBreak(currentUser.id);
    toast.success('☕ Break mode activated. Enjoy your lunch/tea break!');
  };

  const handleEndBreak = () => {
    endBreak(currentUser.id);
    toast.success('💻 Break ended. Welcome back, shift resumed!');
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

  const myProfile = profiles.find((p) => p.id === currentUser?.id || p.user_id === currentUser?.id);
  const myNotifications = React.useMemo(() => {
    const raw = notifications.filter(
      (n) =>
        n.employee_id === currentUser?.id ||
        (myProfile && (n.employee_id === myProfile.id || n.employee_id === myProfile.user_id))
    );
    // Deduplicate by ID and content signature
    const seen = new Set<string>();
    return raw.filter((n) => {
      const contentKey = `${n.title}|${n.message}|${(n.created_at || '').slice(0, 16)}`;
      if (seen.has(n.id) || seen.has(contentKey)) return false;
      seen.add(n.id);
      seen.add(contentKey);
      return true;
    });
  }, [notifications, currentUser?.id, myProfile]);

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
          className="flex h-8 w-full items-center justify-between rounded-full border border-[#212735] bg-[#121620] px-3 text-xs text-slate-400 hover:border-[#333d52] hover:text-slate-200 transition-colors shadow-sm font-sans"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Search or type /...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center gap-1 rounded-full border border-[#262d3e] bg-[#171b26] px-2 py-0.5 font-mono text-[9px] text-slate-300 font-semibold shadow-inner">
              <span>Ctrl</span>
              <span className="text-slate-500 font-normal">+</span>
              <span>K</span>
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2">
        {/* Attendance Punch Mini-Station */}
        <div className="flex items-center rounded-full border border-[#212735] bg-[#121620] pl-2.5 pr-1 py-1 gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 mr-1">
            <Clock className={`h-3.5 w-3.5 ${isOnBreak ? 'text-amber-400 animate-bounce' : isClockedIn ? 'text-emerald-400 animate-pulse' : isShiftCompleted ? 'text-emerald-500' : 'text-blue-400'}`} />
            <span className="font-semibold text-slate-200">{elapsed}</span>
          </div>

          {/* Break Mode Quick Toggle */}
          {isClockedIn && (
            isOnBreak ? (
              <button
                onClick={handleEndBreak}
                title="End break and resume shift"
                className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40 transition-all shadow-sm animate-pulse"
              >
                <Coffee className="h-2.5 w-2.5" />
                <span>Resume ({breakElapsed})</span>
              </button>
            ) : (
              <button
                onClick={handleStartBreak}
                title="Take Lunch / Tea break"
                className="flex items-center gap-1 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-[#181d29] text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/15 border border-[#272f42] hover:border-amber-500/30 transition-all"
              >
                <Coffee className="h-2.5 w-2.5 text-amber-400" />
                <span>Break</span>
              </button>
            )
          )}

          {isShiftCompleted ? (
            <button
              disabled
              title="Shift completed for today. Submit an Attendance Regularization request if needed."
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-[#181d29] text-slate-400 border border-slate-700/60 cursor-not-allowed select-none"
            >
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
              <span>Shift Done</span>
            </button>
          ) : (
            <button
              onClick={handleToggleAttendance}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 rounded-full transition-all duration-150 shadow-sm ${
                isClockedIn
                  ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
              }`}
            >
              {isClockedIn ? <Square className="h-2.5 w-2.5 fill-current" /> : <Play className="h-2.5 w-2.5 fill-current" />}
              <span>{isClockedIn ? 'Punch Out' : 'Punch In'}</span>
            </button>
          )}
        </div>

        {/* Download Desktop App Button */}
        <button
          onClick={() => navigate('/download')}
          title="Download TCY One Desktop App (Windows / macOS)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141822] hover:bg-[#1c2230] text-slate-300 hover:text-white border border-[#272f42] hover:border-slate-600 text-[10px] font-mono transition-all shadow-sm"
        >
          <Laptop className="h-3 w-3 text-sky-400" />
          <span className="hidden sm:inline">Desktop App</span>
        </button>

        {/* Install Desktop PWA Quick Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            title="Install TCY One Desktop App (Windows / macOS)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-semibold transition-all shadow-sm animate-pulse"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Install PWA</span>
          </button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#212735] bg-[#121620] text-slate-400 hover:bg-[#181d29] hover:text-white transition-colors">
              <Bell className="h-3.5 w-3.5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white border border-[#121620]">
                  {unreadNotifs.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-84 border-[#222837] bg-[#0e121a] shadow-2xl p-0 rounded-xl overflow-hidden">
            {/* Header with Title & Read All */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1c2230] bg-[#121622]">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-white">Notifications ({unreadNotifs.length})</span>
              </div>
              {unreadNotifs.length > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead(currentUser.id)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Desktop Notification System Permission Pill */}
            {notifPermission !== 'granted' && (
              <div className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-blue-300">
                  <Monitor className="h-3 w-3 shrink-0" />
                  <span>Desktop OS Alerts</span>
                </div>
                <button
                  onClick={handleRequestPermission}
                  className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[10px] transition-colors shadow-sm"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Notification Items List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-[#181d28]">
              {myNotifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No new notifications</div>
              ) : (
                myNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      if (n.action_url) {
                        window.location.hash = n.action_url;
                      }
                    }}
                    className={`p-3 text-xs hover:bg-[#141824] cursor-pointer transition-colors ${
                      !n.is_read ? 'bg-blue-500/[0.06]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'attendance' ? (
                          <div className="h-5 w-5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <Clock className="h-3 w-3" />
                          </div>
                        ) : n.type === 'task' ? (
                          <div className="h-5 w-5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                            <Layers className="h-3 w-3" />
                          </div>
                        ) : n.type === 'leave' ? (
                          <div className="h-5 w-5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                            <Calendar className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                            <Info className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-semibold truncate text-[11px] ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono shrink-0">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug break-words">{n.message}</p>
                      </div>
                    </div>
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

              {/* Designation */}
              {(() => {
                const desigTitle =
                  currentUser.designation_title ||
                  currentUser.designation?.title ||
                  designations.find((d) => d.id === currentUser.designation_id)?.title ||
                  null;
                return (
                  <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                      Designation
                    </span>
                    <span className="text-slate-200 text-[11px] leading-snug">
                      {desigTitle || '—'}
                    </span>
                  </div>
                );
              })()}

              {/* Department */}
              {(() => {
                const dept =
                  departments.find((d) => d.id === currentUser.department_id) ||
                  currentUser.department ||
                  null;
                return (
                  <div className="flex flex-col space-y-0.5 border-t border-[#161b26] pt-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                      Department
                    </span>
                    {dept ? (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-none text-[9px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/50 font-mono">
                          {dept.code}
                        </span>
                        <span className="text-slate-200 text-[11px]">{dept.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-200 text-[11px]">{'—'}</span>
                    )}
                  </div>
                );
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
