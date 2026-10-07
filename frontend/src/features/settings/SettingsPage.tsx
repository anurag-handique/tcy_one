import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Database,
  RefreshCw,
  Shield,
  Layers,
  Clock,
  Save,
  CalendarCheck,
  Zap,
  Building2,
  ArrowRight,
  Plus,
  CheckCircle2,
  Users2,
  Award,
  Palette,
  Sparkles,
  Keyboard,
  Command,
  Monitor,
  Type,
  Gauge,
  Sliders,
  Bell,
  Volume2,
  Download,
  UploadCloud,
  Apple,
  HardDrive,
  Trash2,
  ExternalLink,
  FileCode,
  Laptop,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore, DensityMode, ThemePreset, AccentColor, FontFamily } from '@/stores/uiStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { AppleLogo, WindowsLogo } from '@/components/icons/PlatformIcons';
import { formatDate, isSaturdayOffDay, cn } from '@/lib/utils';
import { DesktopPlatform } from '@/types';
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  sendNativeNotification,
} from '@/lib/desktopNotification';

import {
  detectClientPlatform,
  isWebPushSupported,
  getActivePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/webPush';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';


type SettingsTab =
  | 'attendance'
  | 'notifications'
  | 'releases'
  | 'saturdays'
  | 'density'
  | 'appearance'
  | 'shortcuts'
  | 'database'
  | 'organization';

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, activeRole } = useAuthStore();
  const {
    resetToDefaultData,
    attendancePolicy,
    updateAttendancePolicy,
    toggleWorkingSaturdayOverride,
    departments,
    designations,
    profiles,
    appReleases,
    uploadAppRelease,
    registerAppReleaseUrl,
    deleteAppRelease,
    fetchAppReleases,
  } = useDataStore();

  // Desktop Release Upload State
  const [uploadMode, setUploadMode] = React.useState<'file' | 'url'>('url');
  const [uploadPlatform, setUploadPlatform] = React.useState<DesktopPlatform>('windows');
  const [uploadVersion, setUploadVersion] = React.useState('1.0.2');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadDirectUrl, setUploadDirectUrl] = React.useState('');
  const [uploadNotes, setUploadNotes] = React.useState('');
  const [isUploadingRelease, setIsUploadingRelease] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchAppReleases();
  }, [fetchAppReleases]);
  const {
    densityMode,
    setDensityMode,
    themePreset,
    setThemePreset,
    accentColor,
    setAccentColor,
    fontFamily,
    setFontFamily,
    reducedMotion,
    setReducedMotion,
    setShortcutsModalOpen,
    setTaskModalOpen,
    setLeaveModalOpen,
    setStandupModalOpen,
    setPunchModalOpen,
    toggleSidebar,
  } = useUIStore();

  const [activeTab, setActiveTab] = React.useState<SettingsTab>('attendance');

  const isSuperAdminOrAdmin =
    activeRole === 'super_admin' ||
    activeRole === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin';

  // Form State for Attendance Policy
  const [officeStartTime, setOfficeStartTime] = React.useState(attendancePolicy.office_start_time || '09:30');
  const [maxPunchInTime, setMaxPunchInTime] = React.useState(attendancePolicy.max_punch_in_time || '10:30');
  const [officeEndTime, setOfficeEndTime] = React.useState(attendancePolicy.office_end_time || '18:30');
  const [maxPunchOutTime, setMaxPunchOutTime] = React.useState(attendancePolicy.max_punch_out_time || '21:00');
  const [standardHours, setStandardHours] = React.useState(String(attendancePolicy.standard_hours || 8.0));
  const [allowOvertime, setAllowOvertime] = React.useState(attendancePolicy.allow_overtime ?? true);
  const [strictEnforcement, setStrictEnforcement] = React.useState(attendancePolicy.strict_enforcement ?? false);
  const [saturdayOffRule, setSaturdayOffRule] = React.useState<any>(attendancePolicy.saturday_off_rule || '3rd_4th');

  React.useEffect(() => {
    setOfficeStartTime(attendancePolicy.office_start_time || '09:30');
    setMaxPunchInTime(attendancePolicy.max_punch_in_time || '10:30');
    setOfficeEndTime(attendancePolicy.office_end_time || '18:30');
    setMaxPunchOutTime(attendancePolicy.max_punch_out_time || '21:00');
    setStandardHours(String(attendancePolicy.standard_hours || 8.0));
    setAllowOvertime(attendancePolicy.allow_overtime ?? true);
    setStrictEnforcement(attendancePolicy.strict_enforcement ?? false);
    setSaturdayOffRule(attendancePolicy.saturday_off_rule || '3rd_4th');
  }, [attendancePolicy]);

  // PWA & Web Push State
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [isPushSubscribed, setIsPushSubscribed] = React.useState(false);
  const [isSubscribing, setIsSubscribing] = React.useState(false);
  const [detectedPlatform, setDetectedPlatform] = React.useState<string>('windows');
  const [pushSupported, setPushSupported] = React.useState(true);


  React.useEffect(() => {
    setDetectedPlatform(detectClientPlatform());
    setPushSupported(isWebPushSupported());
    getActivePushSubscription().then((sub) => {
      setIsPushSubscribed(!!sub);
    });
  }, []);

  const handleToggleWebPush = async () => {
    if (!currentUser) {
      toast.error('Please sign in to register device push subscription.');
      return;
    }
    setIsSubscribing(true);
    try {
      if (isPushSubscribed) {
        const res = await unsubscribeFromPush();
        if (res.success) {
          setIsPushSubscribed(false);
          toast.success('Device unsubscribed from push notifications.');
        } else {
          toast.error(res.error || 'Failed to unsubscribe.');
        }
      } else {
        const res = await subscribeToPush(currentUser.id);
        if (res.success) {
          setIsPushSubscribed(true);
          toast.success('Device successfully enrolled in OS Desktop Web Push!');
        } else {
          toast.error(res.error || 'Failed to subscribe.');
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSavePolicy = (e: React.FormEvent) => {

    e.preventDefault();
    updateAttendancePolicy({
      office_start_time: officeStartTime,
      max_punch_in_time: maxPunchInTime,
      office_end_time: officeEndTime,
      max_punch_out_time: maxPunchOutTime,
      standard_hours: parseFloat(standardHours) || 8.0,
      allow_overtime: allowOvertime,
      strict_enforcement: strictEnforcement,
      saturday_off_rule: saturdayOffRule,
    });
    toast.success('Attendance policies saved');
  };

  // Generate Saturdays for current month and next month
  const upcomingSaturdays = React.useMemo(() => {
    const list: { dateStr: string; dateObj: Date }[] = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 6) {
        list.push({
          dateStr: d.toISOString().split('T')[0],
          dateObj: new Date(d),
        });
      }
    }
    return list;
  }, []);

  const handleToggleSaturday = (dateStr: string) => {
    if (!isSuperAdminOrAdmin) {
      toast.error('Only Super Admin can modify Saturday working schedules');
      return;
    }
    toggleWorkingSaturdayOverride(dateStr);
    const isNowWorking = !attendancePolicy.working_saturdays_override?.includes(dateStr);
    toast.success(
      isNowWorking
        ? `Enabled ${formatDate(dateStr, 'dd MMM yyyy')} as an Urgent Working Saturday`
        : `Restored ${formatDate(dateStr, 'dd MMM yyyy')} to standard holiday status`
    );
  };

  const handleResetData = () => {
    if (window.confirm('Reset local state back to default TCY seed records?')) {
      resetToDefaultData();
      toast.success('Workspace reset to default seed records');
    }
  };

  const handleUploadReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVersion.trim()) {
      toast.error('Please specify a version number (e.g. 1.0.2).');
      return;
    }

    if (uploadMode === 'file') {
      if (!uploadFile) {
        toast.error('Please select an installer binary (.exe, .dmg, or .zip) to upload.');
        return;
      }

      try {
        setIsUploadingRelease(true);
        toast.info(`Uploading ${uploadFile.name} to cloud storage...`);

        const result = await uploadAppRelease({
          file: uploadFile,
          platform: uploadPlatform,
          version: uploadVersion.trim(),
          releaseNotes: uploadNotes.trim(),
          uploadedBy: currentUser?.id,
        });

        if (result.success) {
          toast.success(`Successfully published ${uploadPlatform.toUpperCase()} installer v${uploadVersion.trim()}!`);
          setUploadFile(null);
          setUploadNotes('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          toast.error(result.error || 'Failed to upload installer binary.');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error during upload');
      } finally {
        setIsUploadingRelease(false);
      }
    } else {
      // URL Mode
      if (!uploadDirectUrl.trim()) {
        toast.error('Please enter a valid direct download URL (e.g., GitHub Releases or CDN link).');
        return;
      }

      try {
        setIsUploadingRelease(true);
        const result = await registerAppReleaseUrl({
          platform: uploadPlatform,
          version: uploadVersion.trim(),
          fileName: uploadPlatform === 'macos' ? `TCY One ${uploadVersion.trim()}.dmg` : `TCY One Setup ${uploadVersion.trim()}.exe`,
          fileUrl: uploadDirectUrl.trim(),
          releaseNotes: uploadNotes.trim(),
          uploadedBy: currentUser?.id,
        });

        if (result.success) {
          toast.success(`Registered ${uploadPlatform.toUpperCase()} installer download URL v${uploadVersion.trim()}!`);
          setUploadDirectUrl('');
          setUploadNotes('');
        } else {
          toast.error(result.error || 'Failed to register download URL.');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error registering URL');
      } finally {
        setIsUploadingRelease(false);
      }
    }
  };

  const handleDeleteRelease = async (platform: DesktopPlatform) => {
    if (!confirm(`Are you sure you want to remove the ${platform.toUpperCase()} installer release?`)) return;
    try {
      await deleteAppRelease(platform);
      toast.success(`Removed ${platform.toUpperCase()} installer release.`);
    } catch (e) {
      toast.error('Failed to remove release');
    }
  };

  const activeOverridesCount = attendancePolicy.working_saturdays_override?.length || 0;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Win / Ctrl';

  return (
    <div className="space-y-3 max-w-5xl">
      {/* Desktop App Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b202c] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <SettingsIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight font-mono uppercase">
              System Preferences
            </h1>
          </div>
        </div>

        {/* Access Status Pill */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold border uppercase flex items-center gap-1',
              isSuperAdminOrAdmin
                ? 'bg-blue-950/40 text-blue-400 border-blue-900/50'
                : 'bg-[#121620] text-slate-400 border-[#1f2533]'
            )}
          >
            <Shield className="h-3 w-3" />
            <span>{activeRole === 'super_admin' ? 'Super Admin' : activeRole.toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* Desktop Application Square Tabs Strip */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#0a0d14] border border-[#1b202d] text-xs font-mono scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'attendance'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Clock className="h-3 w-3" />
          <span>Shifts & Timings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'notifications'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Bell className="h-3 w-3 text-blue-400" />
          <span>Realtime & OS Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('releases')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'releases'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Laptop className="h-3 w-3 text-sky-400" />
          <span>Desktop Apps & Installers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saturdays')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'saturdays'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <CalendarCheck className="h-3 w-3" />
          <span>Saturday Policy</span>
          {activeOverridesCount > 0 && (
            <span
              className={cn(
                'ml-1 text-[9px] font-mono px-1 py-0.2 border',
                activeTab === 'saturdays'
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              )}
            >
              {activeOverridesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('density')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'density'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Layers className="h-3 w-3" />
          <span>Display & Density</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'appearance'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Palette className="h-3 w-3" />
          <span>Themes & Styling</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shortcuts')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'shortcuts'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Keyboard className="h-3 w-3" />
          <span>Shortcuts</span>
        </button>

        {isSuperAdminOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
              activeTab === 'database'
                ? 'tab-active'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            )}
          >
            <Database className="h-3 w-3" />
            <span>Database & Cloud</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('organization')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
            activeTab === 'organization'
              ? 'tab-active'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <Building2 className="h-3 w-3" />
          <span>Organization</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SHIFTS & ATTENDANCE TIMINGS */}
      {/* ===================================================================== */}
      {activeTab === 'attendance' && (
        <form onSubmit={handleSavePolicy} className="space-y-3">
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Daily Shift Rules</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {/* Morning Shift */}
              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#141925] pb-1.5">
                  <span className="text-[11px] font-bold font-mono text-slate-200 uppercase flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-emerald-400"></span>
                    Morning Punch-In
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">ENTRY</span>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Shift Start Time
                  </label>
                  <Input
                    type="time"
                    value={officeStartTime}
                    onChange={(e) => setOfficeStartTime(e.target.value)}
                    disabled={!isSuperAdminOrAdmin}
                    className="bg-[#10141e] border-[#1f2637] text-white font-mono text-xs h-7 rounded-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Punches after this are flagged as Late.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Grace Cutoff Limit
                  </label>
                  <Input
                    type="time"
                    value={maxPunchInTime}
                    onChange={(e) => setMaxPunchInTime(e.target.value)}
                    disabled={!isSuperAdminOrAdmin}
                    className="bg-[#10141e] border-[#1f2637] text-white font-mono text-xs h-7 rounded-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Punches past this cutoff trigger breach penalty.
                  </span>
                </div>
              </div>

              {/* Evening Shift */}
              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#141925] pb-1.5">
                  <span className="text-[11px] font-bold font-mono text-slate-200 uppercase flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-blue-400"></span>
                    Evening Punch-Out
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">EXIT</span>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Shift End Time
                  </label>
                  <Input
                    type="time"
                    value={officeEndTime}
                    onChange={(e) => setOfficeEndTime(e.target.value)}
                    disabled={!isSuperAdminOrAdmin}
                    className="bg-[#10141e] border-[#1f2637] text-white font-mono text-xs h-7 rounded-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Standard closure for departure logs.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Target Hours / Day
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="4"
                    max="14"
                    value={standardHours}
                    onChange={(e) => setStandardHours(e.target.value)}
                    disabled={!isSuperAdminOrAdmin}
                    className="bg-[#10141e] border-[#1f2637] text-white font-mono text-xs h-7 rounded-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Hours required before overtime starts.
                  </span>
                </div>
              </div>
            </div>

            {/* Overtime and Strict Enforcement Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center justify-between p-2.5 bg-[#080b11] border border-[#171e2c]">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Overtime Calculation</span>
                  <span className="text-[10px] text-slate-500">Auto calculate hours past target.</span>
                </div>
                <button
                  type="button"
                  onClick={() => isSuperAdminOrAdmin && setAllowOvertime(!allowOvertime)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-mono font-bold border transition-all',
                    allowOvertime
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-[#121620] text-slate-400 border-[#222837]'
                  )}
                >
                  {allowOvertime ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#080b11] border border-[#171e2c]">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Cutoff Breach Rule</span>
                  <span className="text-[10px] text-slate-500">Action when punched after grace limit.</span>
                </div>
                <button
                  type="button"
                  onClick={() => isSuperAdminOrAdmin && setStrictEnforcement(!strictEnforcement)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-mono font-bold border transition-all',
                    strictEnforcement
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-[#121620] text-slate-400 border-[#222837]'
                  )}
                >
                  {strictEnforcement ? 'STRICT (ABSENT)' : 'HALF-DAY'}
                </button>
              </div>
            </div>

            {isSuperAdminOrAdmin && (
              <div className="pt-2 border-t border-[#18202d] flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5 h-7.5 px-4 rounded-none"
                >
                  <Save className="h-3 w-3" />
                  <span>Save Rules</span>
                </Button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB: REALTIME & OS NOTIFICATION SETTINGS */}
      {/* ===================================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* 1. Native Desktop OS Notifications Station */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2.5">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-xs font-bold font-mono uppercase text-white block">
                    Windows & macOS Desktop System Alerts
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Native OS banner notifications with sound cues for attendance, tickets, and sprints
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 border bg-[#121622] text-slate-300 border-[#222837] uppercase">
                  OS: {detectedPlatform.toUpperCase()}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-mono px-2 py-0.5 border font-semibold',
                    getDesktopNotificationPermission() === 'granted'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : getDesktopNotificationPermission() === 'denied'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  )}
                >
                  STATUS: {getDesktopNotificationPermission().toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Browser Permission</span>
                  <Volume2 className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Allows TCY One to send real-time alerts to the Windows Action Center or macOS Notification Center even when your browser tab is minimized.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const res = await requestDesktopNotificationPermission();
                      if (res === 'granted') toast.success('OS Desktop notifications granted!');
                      else toast.error(`Permission: ${res}`);
                    }}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 rounded-none"
                  >
                    Request / Check Permission
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await sendNativeNotification('🔔 TCY One Desktop Alert', {
                        body: 'Testing Windows Action Center & macOS banner delivery.',
                        onClickUrl: '/settings',
                        requireInteraction: true,
                      });
                      if (res) {
                        toast.success('Test notification dispatched to Windows Action Center!');
                      } else {
                        toast.error('Notification blocked. Please allow notifications in browser/OS settings.');
                      }
                    }}
                    className="h-7 text-xs border-[#222837] bg-[#121622] hover:bg-[#181d28] text-slate-300 font-mono"
                  >
                    Send Test Notification
                  </Button>
                </div>
              </div>


              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Audio Chime Synthesis</span>
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Integrated dual-tone harmonic chime synthesised via Web Audio API. Provides audio feedback on punches and task assignments.
                </p>
                <div className="pt-1">
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
                    Active • Web Audio Enabled
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. W3C Web Push & Service Worker Background Delivery */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold font-mono uppercase text-white block">
                    W3C Web Push & Service Worker Subscription
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Direct background push delivery via VAPID keys to FCM (Windows) & APNs (macOS Safari 16+)
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono px-2 py-0.5 border font-semibold',
                  isPushSubscribed
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                )}
              >
                {isPushSubscribed ? 'ENROLLED & ACTIVE' : 'NOT SUBSCRIBED'}
              </span>
            </div>

            <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Background Push Subscription Token
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Registers this {detectedPlatform.toUpperCase()} device into the Supabase <code className="text-blue-400 font-mono">push_subscriptions</code> table for instant background delivery.
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isSubscribing || !pushSupported}
                  onClick={handleToggleWebPush}
                  className={cn(
                    'h-7 text-xs font-mono font-medium px-4 rounded-none transition-all',
                    isPushSubscribed
                      ? 'bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  )}
                >
                  {isSubscribing
                    ? 'Processing...'
                    : isPushSubscribed
                    ? 'Unsubscribe Device'
                    : `Subscribe This ${detectedPlatform === 'macos' ? 'Mac' : 'Windows'} Device`}
                </Button>
              </div>

              <div className="pt-2 border-t border-[#141925] flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full"></span>
                  Service Worker: <strong className="text-slate-200">/sw.js (Ready)</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Protocol: <strong className="text-slate-200">W3C Push API / RFC 8291</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Encryption: <strong className="text-slate-200">ECDH (P-256 + VAPID)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Progressive Web App (PWA) Desktop Client Station */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-4 space-y-3">

            <div className="flex items-center justify-between border-b border-[#18202d] pb-2.5">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-xs font-bold font-mono uppercase text-white block">
                    Progressive Web App (PWA) Desktop Client
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Install TCY One as a native standalone desktop app on Windows 10/11 or macOS Dock
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono px-2 py-0.5 border font-semibold',
                  isInstalled
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : isInstallable
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                )}
              >
                {isInstalled ? 'INSTALLED (STANDALONE)' : isInstallable ? 'READY TO INSTALL' : 'BROWSER MODE'}
              </span>
            </div>

            <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Native Desktop Experience & Offline Caching
                  </span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Running as an installed PWA provides native window controls, dedicated dock/taskbar icons, instant offline cache fallback, and system startup integration.
                  </p>
                </div>

                {isInstallable && !isInstalled && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={installApp}
                    className="h-7 text-xs font-mono font-medium px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-none whitespace-nowrap"
                  >
                    Install TCY One App
                  </Button>
                )}
              </div>

              <div className="pt-2 border-t border-[#141925] flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full"></span>
                  Manifest: <strong className="text-slate-200">/manifest.json</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Display: <strong className="text-slate-200">Standalone Window</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Offline Fallback: <strong className="text-slate-200">Enabled (Cache-First)</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

      )}



      {/* ===================================================================== */}
      {/* TAB 2: SATURDAY POLICY & OVERRIDES */}
      {/* ===================================================================== */}
      {activeTab === 'saturdays' && (
        <div className="space-y-3">
          {/* Saturday Rule Selector */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Default Saturday Rule</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 border border-purple-500/20 bg-purple-500/10 text-purple-300">
                RECURRING
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <span className="text-xs text-slate-300">Company cadence for off-Saturdays:</span>
              <select
                value={saturdayOffRule}
                onChange={(e) => {
                  const val = e.target.value;
                  setSaturdayOffRule(val);
                  updateAttendancePolicy({ saturday_off_rule: val as any });
                  toast.success('Updated Saturday policy');
                }}
                disabled={!isSuperAdminOrAdmin}
                className="h-7 border border-[#222837] bg-[#121622] px-2 text-xs font-mono text-white focus:border-purple-500 focus:outline-none rounded-none"
              >
                <option value="3rd_4th">3rd & 4th Saturdays OFF (Default)</option>
                <option value="2nd_4th">2nd & 4th Saturdays OFF</option>
                <option value="all">All Saturdays OFF (5-Day Workweek)</option>
                <option value="none">All Saturdays Working (6-Day Workweek)</option>
              </select>
            </div>
          </div>

          {/* Urgent Overrides Calendar Station */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Urgent Work Overrides</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.2 border border-purple-500/25 bg-purple-500/15 text-purple-300 font-bold">
                {activeOverridesCount} ACTIVE
              </span>
            </div>

            <div className="divide-y divide-[#151b26] border border-[#18202d] bg-[#080b11]">
              {upcomingSaturdays.map((sat) => {
                const statusInfo = isSaturdayOffDay(sat.dateObj, attendancePolicy);
                const isOverride = statusInfo.isOverrideWorking;

                return (
                  <div
                    key={sat.dateStr}
                    className={cn(
                      'flex items-center justify-between p-2.5 text-xs transition-colors',
                      isOverride ? 'bg-purple-950/25' : 'hover:bg-[#101522]'
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-white text-[11px]">
                          {formatDate(sat.dateObj, 'dd MMM yyyy')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({statusInfo.label.split('(')[0].trim()})
                        </span>
                      </div>
                      <div>
                        <span
                          className={cn(
                            'text-[9px] font-mono px-1 py-0.2 border uppercase inline-block',
                            isOverride
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                              : statusInfo.isOff
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                          )}
                        >
                          {isOverride
                            ? 'MANDATORY WORKDAY'
                            : statusInfo.isOff
                            ? 'OFFICIAL OFF'
                            : 'STANDARD WORKDAY'}
                        </span>
                      </div>
                    </div>

                    {isSuperAdminOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleSaturday(sat.dateStr)}
                        className={cn(
                          'h-6.5 px-2.5 text-[10px] font-mono font-medium border transition-all flex items-center gap-1',
                          isOverride
                            ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500'
                            : statusInfo.isOff
                            ? 'bg-[#121622] hover:bg-purple-950/50 hover:text-purple-300 text-slate-300 border-[#222a3c]'
                            : 'bg-[#121622] text-slate-600 border-[#1c2230] opacity-50 cursor-not-allowed'
                        )}
                        disabled={!statusInfo.isOff && !isOverride}
                      >
                        {isOverride ? (
                          <>
                            <Zap className="h-2.5 w-2.5 text-yellow-300" />
                            <span>Revert</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-2.5 w-2.5" />
                            <span>Enable</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DISPLAY & DENSITY */}
      {/* ===================================================================== */}
      {activeTab === 'density' && (
        <div className="space-y-3">
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Display Layout Density</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 border border-blue-500/20 bg-blue-500/10 text-blue-400">
                ACTIVE: {densityMode.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              Choose your preferred interface density. Density adjusts table row heights, grid gaps, padding, and information compactness across all workspaces.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Comfortable Mode Card */}
              <div
                onClick={() => {
                  setDensityMode('comfortable');
                  toast.success('Switched to Comfortable spacing');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2',
                  densityMode === 'comfortable'
                    ? 'accent-border bg-white/5 shadow-md'
                    : 'border-[#1b2230] bg-[#080b11] hover:border-[#2a3449]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Comfortable</span>
                  {densityMode === 'comfortable' && <CheckCircle2 className="h-3.5 w-3.5 accent-text" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Spacious desktop margins, standard row heights, and generous card padding.
                </p>
                <div className="pt-2 border-t border-[#18202d] space-y-1.5 font-mono text-[9px]">
                  <div className="flex items-center justify-between p-1.5 bg-[#121622] border border-[#202838]">
                    <span className="text-slate-300">Standard Row</span>
                    <span className="text-emerald-400 font-bold">38px</span>
                  </div>
                  <div className="h-2 bg-blue-500/20 w-full"></div>
                </div>
              </div>

              {/* Compact Mode Card */}
              <div
                onClick={() => {
                  setDensityMode('compact');
                  toast.success('Switched to Compact high-density');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2',
                  densityMode === 'compact'
                    ? 'accent-border bg-white/5 shadow-md'
                    : 'border-[#1b2230] bg-[#080b11] hover:border-[#2a3449]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Compact High-Density</span>
                  {densityMode === 'compact' && <CheckCircle2 className="h-3.5 w-3.5 accent-text" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Condensed table row heights, tight grid gaps, and maximum data per viewport.
                </p>
                <div className="pt-2 border-t border-[#18202d] space-y-1 font-mono text-[9px]">
                  <div className="flex items-center justify-between p-1 bg-[#121622] border border-[#202838]">
                    <span className="text-slate-300">Compact Row</span>
                    <span className="text-blue-400 font-bold">28px</span>
                  </div>
                  <div className="h-1.5 bg-blue-500/20 w-full"></div>
                </div>
              </div>

              {/* Ultra Compact Card */}
              <div
                onClick={() => {
                  setDensityMode('ultra');
                  toast.success('Switched to Ultra-Compact CLI mode');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2',
                  densityMode === 'ultra'
                    ? 'accent-border bg-white/5 shadow-md'
                    : 'border-[#1b2230] bg-[#080b11] hover:border-[#2a3449]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Ultra-Compact CLI</span>
                  {densityMode === 'ultra' && <CheckCircle2 className="h-3.5 w-3.5 accent-text" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Maximum screen efficiency with micro padding and developer monospace styling.
                </p>
                <div className="pt-2 border-t border-[#18202d] space-y-0.5 font-mono text-[9px]">
                  <div className="flex items-center justify-between px-1 py-0.5 bg-[#121622] border border-[#202838]">
                    <span className="text-slate-300">Ultra Row</span>
                    <span className="text-purple-400 font-bold">22px</span>
                  </div>
                  <div className="h-1 bg-purple-500/20 w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: THEMES & VISUAL STYLING */}
      {/* ===================================================================== */}
      {activeTab === 'appearance' && (
        <div className="space-y-3">
          {/* 1. Theme Presets */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Desktop Theme Presets</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 border border-blue-500/20 bg-blue-500/10 text-blue-400">
                ACTIVE: {themePreset.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              {/* Obsidian Theme */}
              <div
                onClick={() => {
                  setThemePreset('obsidian');
                  toast.success('Theme applied: Obsidian Dark');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2 relative overflow-hidden',
                  themePreset === 'obsidian'
                    ? 'accent-border bg-[#0e121a] ring-1 ring-white/10'
                    : 'border-[#1b2230] bg-[#0b0d13] hover:border-[#2a3449]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Obsidian Dark</span>
                  {themePreset === 'obsidian' && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                </div>
                <div className="h-6 w-full bg-[#0b0d13] border border-[#1b202c] flex items-center px-1.5 gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <div className="h-1.5 w-8 bg-slate-700"></div>
                </div>
                <p className="text-[9px] text-slate-400 font-mono">Default Charcoal</p>
              </div>

              {/* Midnight Navy Theme */}
              <div
                onClick={() => {
                  setThemePreset('midnight');
                  toast.success('Theme applied: Midnight Navy');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2 relative overflow-hidden',
                  themePreset === 'midnight'
                    ? 'border-cyan-500 bg-[#080d1a] ring-1 ring-cyan-500/50'
                    : 'border-[#152238] bg-[#060913] hover:border-[#203658]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">Midnight Navy</span>
                  {themePreset === 'midnight' && <CheckCircle2 className="h-3 w-3 text-cyan-400" />}
                </div>
                <div className="h-6 w-full bg-[#060913] border border-[#152238] flex items-center px-1.5 gap-1">
                  <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                  <div className="h-1.5 w-8 bg-cyan-950"></div>
                </div>
                <p className="text-[9px] text-slate-400 font-mono">Deep Ocean Blue</p>
              </div>

              {/* Matrix Zinc Theme */}
              <div
                onClick={() => {
                  setThemePreset('matrix');
                  toast.success('Theme applied: Matrix Zinc');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2 relative overflow-hidden',
                  themePreset === 'matrix'
                    ? 'border-emerald-500 bg-[#060a08] ring-1 ring-emerald-500/50'
                    : 'border-[#122419] bg-[#040705] hover:border-[#1d3d2a]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">Matrix Zinc</span>
                  {themePreset === 'matrix' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>
                <div className="h-6 w-full bg-[#040705] border border-[#122419] flex items-center px-1.5 gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <div className="h-1.5 w-8 bg-emerald-950"></div>
                </div>
                <p className="text-[9px] text-slate-400 font-mono">High Contrast Green</p>
              </div>

              {/* Deep Amethyst Theme */}
              <div
                onClick={() => {
                  setThemePreset('amethyst');
                  toast.success('Theme applied: Deep Amethyst');
                }}
                className={cn(
                  'p-3 border cursor-pointer transition-all space-y-2 relative overflow-hidden',
                  themePreset === 'amethyst'
                    ? 'border-purple-500 bg-[#0f0a1b] ring-1 ring-purple-500/50'
                    : 'border-[#241638] bg-[#0a0612] hover:border-[#382258]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">Deep Amethyst</span>
                  {themePreset === 'amethyst' && <CheckCircle2 className="h-3 w-3 text-purple-400" />}
                </div>
                <div className="h-6 w-full bg-[#0a0612] border border-[#241638] flex items-center px-1.5 gap-1">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <div className="h-1.5 w-8 bg-purple-950"></div>
                </div>
                <p className="text-[9px] text-slate-400 font-mono">Royal Violet</p>
              </div>
            </div>
          </div>

          {/* 2. Accent Color Palette */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Accent Color Palette</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 border border-blue-500/20 bg-blue-500/10 text-blue-400">
                ACTIVE: {accentColor.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              {[
                { id: 'blue', label: 'Electric Blue', color: 'bg-blue-600', border: 'border-blue-500' },
                { id: 'emerald', label: 'Emerald Green', color: 'bg-emerald-600', border: 'border-emerald-500' },
                { id: 'violet', label: 'Royal Violet', color: 'bg-violet-600', border: 'border-violet-500' },
                { id: 'amber', label: 'Amber Gold', color: 'bg-amber-600', border: 'border-amber-500' },
                { id: 'rose', label: 'Crimson Rose', color: 'bg-rose-600', border: 'border-rose-500' },
                { id: 'cyan', label: 'Cyber Cyan', color: 'bg-cyan-600', border: 'border-cyan-500' },
              ].map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => {
                    setAccentColor(accent.id as AccentColor);
                    toast.success(`Accent updated to ${accent.label}`);
                  }}
                  className={cn(
                    'p-2.5 border flex flex-col items-center gap-1.5 transition-all cursor-pointer',
                    accentColor === accent.id
                      ? `${accent.border} bg-[#121622] ring-1 ring-white/20`
                      : 'border-[#1b202d] bg-[#080b11] hover:border-[#252f44]'
                  )}
                >
                  <div className={cn('h-5 w-5 rounded-full border border-white/20', accent.color)} />
                  <span className="text-[10px] font-mono text-slate-300 truncate w-full text-center">
                    {accent.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Typography & Motion Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Font Family */}
            <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-[#18202d] pb-2">
                <Type className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Interface Typography</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {[
                  { id: 'sans', label: 'Inter Sans (Modern Desktop)', desc: 'Clean, legible UI typography' },
                  { id: 'mono', label: 'JetBrains Mono (Code/Terminal)', desc: 'Full monospace developer feel' },
                  { id: 'system', label: 'System Native Font', desc: 'OS default native rendering' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFontFamily(f.id as FontFamily);
                      toast.success(`Font set to ${f.label}`);
                    }}
                    className={cn(
                      'w-full p-2 border flex items-center justify-between text-left transition-all',
                      fontFamily === f.id
                        ? 'border-blue-500 bg-blue-950/20'
                        : 'border-[#18202d] bg-[#080b11] hover:border-[#28344c]'
                    )}
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{f.label}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{f.desc}</div>
                    </div>
                    {fontFamily === f.id && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance & Animation */}
            <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-[#18202d] pb-2">
                <Gauge className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Rendering & Performance</span>
              </div>
              <div className="pt-1 space-y-2">
                <div
                  onClick={() => {
                    setReducedMotion(!reducedMotion);
                    toast.success(
                      !reducedMotion ? 'Reduced motion enabled (Instant UI)' : 'Transitions restored'
                    );
                  }}
                  className={cn(
                    'p-3 border cursor-pointer flex items-center justify-between transition-all',
                    reducedMotion
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'border-[#18202d] bg-[#080b11] hover:border-[#28344c]'
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">Instant Rendering (Reduced Motion)</div>
                    <div className="text-[10px] text-slate-400">
                      Disables animation delays for instant snappy clicks
                    </div>
                  </div>
                  <div
                    className={cn(
                      'px-2 py-0.5 text-[9px] font-mono font-bold border uppercase',
                      reducedMotion
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-[#141926] text-slate-400 border-[#222a3c]'
                    )}
                  >
                    {reducedMotion ? 'ENABLED' : 'DISABLED'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: KEYBOARD SHORTCUTS HUB */}
      {/* ===================================================================== */}
      {activeTab === 'shortcuts' && (
        <div className="space-y-3">
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Keyboard className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Keyboard Shortcuts Directory</span>
              </div>
              <Button
                size="sm"
                onClick={() => setShortcutsModalOpen(true)}
                className="h-6.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-mono px-2.5 gap-1 rounded-none"
              >
                <span>Launch Quick Overlay</span>
                <kbd className="px-1 bg-white/20 text-white font-bold">?</kbd>
              </Button>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              Work faster with global desktop keybindings. Hotkeys are available throughout the application (excluding inside text input fields).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Quick Actions */}
              <div className="p-3 bg-[#080b11] border border-[#18202d] space-y-2">
                <div className="text-[10px] font-bold font-mono uppercase text-blue-400 border-b border-[#141925] pb-1">
                  Global Action Hotkeys
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    { keys: [modKey, 'K'], label: 'Command Palette & Search', action: () => useUIStore.getState().setCommandPaletteOpen(true) },
                    { keys: ['?'], label: 'Shortcuts Cheat Sheet', action: () => setShortcutsModalOpen(true) },
                    { keys: [modKey, 'Shift', 'P'], label: 'Punch In / Clock Out', action: () => setPunchModalOpen(true) },
                    { keys: [modKey, 'Shift', 'T'], label: 'Create New Task', action: () => setTaskModalOpen(true) },
                    { keys: [modKey, 'Shift', 'L'], label: 'Apply for Leave', action: () => setLeaveModalOpen(true) },
                    { keys: [modKey, 'Shift', 'S'], label: 'Submit Daily Standup', action: () => setStandupModalOpen(true) },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between p-1.5 bg-[#0e121a] border border-[#1b2230] hover:border-[#28344a] transition-colors"
                    >
                      <span className="text-[11px] text-slate-300">{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <kbd
                            key={i}
                            className="px-1.5 py-0.5 bg-[#141926] text-blue-300 border border-[#252f44] text-[10px] font-bold font-mono"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Chords */}
              <div className="p-3 bg-[#080b11] border border-[#18202d] space-y-2">
                <div className="text-[10px] font-bold font-mono uppercase text-emerald-400 border-b border-[#141925] pb-1">
                  Two-Key Chords (Press G, then Key)
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    { chord: ['G', 'D'], label: 'Dashboard / My Day', path: '/' },
                    { chord: ['G', 'A'], label: 'Attendance & Punches', path: '/attendance' },
                    { chord: ['G', 'T'], label: 'Tasks Board', path: '/tasks' },
                    { chord: ['G', 'P'], label: 'Projects Roster', path: '/projects' },
                    { chord: ['G', 'L'], label: 'Leave & Holidays', path: '/leave' },
                    { chord: ['G', 'E'], label: 'Employee Directory', path: '/team' },
                    { chord: ['G', 'O'], label: 'Organization Structure', path: '/organization' },
                    { chord: ['G', 'S'], label: 'System Preferences', path: '/settings' },
                  ].map((c) => (
                    <div
                      key={c.label}
                      onClick={() => navigate(c.path)}
                      className="flex items-center justify-between p-1.5 bg-[#0e121a] border border-[#1b2230] hover:border-[#28344a] cursor-pointer transition-colors"
                    >
                      <span className="text-[11px] text-slate-300">{c.label}</span>
                      <div className="flex items-center gap-1">
                        {c.chord.map((k, i) => (
                          <kbd
                            key={i}
                            className="px-1.5 py-0.5 bg-[#141926] text-emerald-300 border border-[#252f44] text-[10px] font-bold font-mono"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: DATABASE & CLOUD STORAGE (Admin only) */}
      {/* ===================================================================== */}
      {activeTab === 'database' && isSuperAdminOrAdmin && (
        <div className="space-y-3">
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">Cloud Storage & Services</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono pt-1">
              <div className="flex items-center justify-between p-2 bg-[#080b11] border border-[#171e2c]">
                <span className="text-slate-400 text-[11px]">Storage Status</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Cloud Database Connected</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#080b11] border border-[#171e2c]">
                <span className="text-slate-400 text-[11px]">Access Architecture</span>
                <span className="text-slate-200 text-[11px]">
                  Enterprise Secure Multi-Role
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#18202d]">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetData}
                className="h-7 text-xs font-mono rounded-none"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                <span>Reset Seed State</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: DESKTOP APPS & CLOUD INSTALLERS */}
      {/* ===================================================================== */}
      {activeTab === 'releases' && (
        <div className="space-y-4">
          
          {/* Header Card */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#18202d] pb-3">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-sky-400" />
                <div>
                  <span className="text-xs font-bold font-mono uppercase text-white block">
                    Desktop Application Packages & Cloud Releases
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Manage and distribute official Windows (.exe) and macOS (.dmg / .zip) desktop installers.
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => navigate('/download')}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-mono px-3 gap-1.5 rounded-none shrink-0"
              >
                <span>View Download Portal</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Super Admin Upload Form */}
          {isSuperAdminOrAdmin && (
            <div className="border border-[#1b2230] bg-[#0c1018] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-bold font-mono uppercase text-white">
                    Publish New Desktop Installer
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Super Admin Exclusive
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-2 border-b border-[#18202d] pb-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={cn(
                    'px-3 py-1 text-xs font-mono transition-all',
                    uploadMode === 'url'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#121620] text-slate-400 hover:text-white'
                  )}
                >
                  Cloudflare / R2 Direct Download URL (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={cn(
                    'px-3 py-1 text-xs font-mono transition-all',
                    uploadMode === 'file'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#121620] text-slate-400 hover:text-white'
                  )}
                >
                  Direct Supabase Upload (&lt; 50 MB)
                </button>
              </div>

              <form onSubmit={handleUploadReleaseSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Platform Picker */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Target Operating System
                    </label>
                    <select
                      value={uploadPlatform}
                      onChange={(e) => setUploadPlatform(e.target.value as DesktopPlatform)}
                      className="h-8 w-full rounded-none border border-[#1b202c] bg-[#080b11] px-2.5 text-xs text-white font-mono"
                    >
                      <option value="windows">Windows (.exe Setup & Portable)</option>
                      <option value="macos">macOS (.dmg & .zip Universal)</option>
                      <option value="linux">Linux (.AppImage / .deb)</option>
                    </select>
                  </div>

                  {/* Version Number */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Release Version Tag
                    </label>
                    <Input
                      type="text"
                      value={uploadVersion}
                      onChange={(e) => setUploadVersion(e.target.value)}
                      placeholder="e.g. 1.0.2"
                      className="h-8 bg-[#080b11] border-[#1b202c] text-xs font-mono rounded-none"
                      required
                    />
                  </div>

                </div>

                {/* Cloudflare URL Input OR File Drop */}
                {uploadMode === 'url' ? (
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Cloudflare / R2 Public Download URL
                    </label>
                    <Input
                      type="url"
                      value={uploadDirectUrl}
                      onChange={(e) => setUploadDirectUrl(e.target.value)}
                      placeholder="https://pub-xxxx.r2.dev/TCY_One_Setup_1.0.2.exe or https://download.thecodeyogi.com/TCY_One_Setup_1.0.2.exe"
                      className="h-8 bg-[#080b11] border-[#1b202c] text-xs font-mono rounded-none text-white"
                      required={uploadMode === 'url'}
                    />
                    <p className="text-[10px] font-mono text-emerald-400 mt-1">
                      High-speed, zero-egress Cloudflare CDN distribution.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Installer Binary File (.exe / .dmg / .zip)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".exe,.dmg,.zip,.appimage,.deb"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      className="block w-full text-xs font-mono text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-mono file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer bg-[#080b11] border border-[#1b202c] p-1.5"
                      required={uploadMode === 'file'}
                    />
                    {uploadFile && (
                      <p className="text-[10px] font-mono text-emerald-400 mt-1">
                        Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </p>
                    )}
                  </div>
                )}

                {/* Release Notes */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Changelog / Release Notes
                  </label>
                  <textarea
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Added background push notification support, faster boot times, and fixed attendance regularization."
                    className="w-full bg-[#080b11] border border-[#1b202c] text-xs font-mono p-2 text-white rounded-none focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between pt-2 border-t border-[#18202d]">
                  <span className="text-[10px] font-mono text-slate-500">
                    Max file size: 500 MB per release
                  </span>

                  <Button
                    type="submit"
                    disabled={isUploadingRelease || !uploadFile}
                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs gap-1.5 px-4 rounded-none disabled:opacity-50"
                  >
                    {isUploadingRelease ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Publish {uploadPlatform.toUpperCase()} Release</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Active Cloud Releases List */}
          <div className="border border-[#1b2230] bg-[#0c1018] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">
                  Active Cloud Distributed Installers ({appReleases.length})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAppReleases()}
                className="h-6 text-[10px] font-mono border-slate-700 px-2 text-slate-300"
              >
                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                <span>Sync</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {appReleases.map((release) => (
                <div
                  key={release.id || release.platform}
                  className="p-3.5 bg-[#080b11] border border-[#171e2c] space-y-3 relative group"
                >
                  <div className="flex items-center justify-between border-b border-[#141925] pb-2">
                    <div className="flex items-center gap-2">
                      {release.platform === 'macos' ? (
                        <AppleLogo className="h-4 w-4 text-slate-100 fill-current" />
                      ) : (
                        <WindowsLogo className="h-4 w-4 text-sky-400 fill-current" />
                      )}
                      <span className="text-xs font-bold font-mono text-white uppercase">
                        {release.platform === 'macos' ? 'macOS Installer' : 'Windows Setup'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold">
                        v{release.version}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-slate-300 font-medium truncate flex items-center gap-1">
                      <FileCode className="h-3 w-3 text-slate-500 shrink-0" />
                      <span className="truncate">{release.file_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Size: {(release.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                      <span>{formatDate(release.uploaded_at)}</span>
                    </div>
                    {release.release_notes && (
                      <p className="text-[10px] text-slate-400 pt-1 line-clamp-2">
                        {release.release_notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#141925] flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (release.file_url && release.file_url !== '#') {
                          window.open(release.file_url, '_blank');
                        } else {
                          toast.info(`Installer v${release.version} can be compiled locally via build scripts.`);
                        }
                      }}
                      className="h-6 text-[10px] font-mono border-slate-700 hover:bg-blue-600 hover:text-white px-2.5"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      <span>Download</span>
                    </Button>

                    {isSuperAdminOrAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRelease(release.platform)}
                        className="h-6 text-[10px] font-mono text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 px-2"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: ORGANIZATION STRUCTURE SHORTCUT */}
      {/* ===================================================================== */}
      {activeTab === 'organization' && (
        <div className="space-y-3">
          <div className="border border-[#1b2230] bg-[#0c1018] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#18202d] pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-bold font-mono uppercase text-white">TCY Consulting Private Limited — Departments & Roles</span>
              </div>

              <Button
                onClick={() => navigate('/organization')}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 gap-1 rounded-none"
              >
                <span>Open Organization</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="text-[11px]">Departments</span>
                  <Building2 className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">{departments.length}</div>
                <span className="text-[9px] text-slate-500 font-mono">Active units</span>
              </div>

              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="text-[11px]">Designations</span>
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">{designations.length}</div>
                <span className="text-[9px] text-slate-500 font-mono">Job titles</span>
              </div>

              <div className="p-3 bg-[#080b11] border border-[#171e2c] space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="text-[11px]">Employees</span>
                  <Users2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">{profiles.length}</div>
                <span className="text-[9px] text-slate-500 font-mono">Staff headcount</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
