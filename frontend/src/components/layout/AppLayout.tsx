import * as React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { CreateTaskModal } from '@/components/shared/CreateTaskModal';
import { ApplyLeaveModal } from '@/components/shared/ApplyLeaveModal';
import { SubmitStandupModal } from '@/components/shared/SubmitStandupModal';
import { ScheduleMeetingModal } from '@/components/shared/ScheduleMeetingModal';
import { LoginModal } from '@/components/shared/LoginModal';
import { PunchLocationModal } from '@/components/shared/PunchLocationModal';
import { KeyboardShortcutsModal } from '@/components/shared/KeyboardShortcutsModal';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAttendanceReminder } from '@/hooks/useAttendanceReminder';
import { formatWorkingDuration } from '@/lib/utils';
import { Clock } from 'lucide-react';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { attendance, tasks, subscribeToRealtimeNotifications } = useDataStore();
  const {
    densityMode,
    themePreset,
    accentColor,
    fontFamily,
    reducedMotion,
    setShortcutsModalOpen,
  } = useUIStore();

  // Initialize universal hotkeys listener
  useKeyboardShortcuts();

  // Initialize evening auto-reminder for unfinished punches
  useAttendanceReminder();

  // Initialize Supabase Realtime WebSocket listener for live cross-device push notifications
  React.useEffect(() => {
    const unsubscribe = subscribeToRealtimeNotifications(currentUser.id);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser.id, subscribeToRealtimeNotifications]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.find(
    (a) => a.employee_id === currentUser.id && a.date === todayStr
  );
  const isClockedIn = Boolean(todayAtt && !todayAtt.clock_out);
  const isShiftCompleted = Boolean(todayAtt?.clock_in && todayAtt?.clock_out);

  const pendingTasksCount = tasks.filter(
    (t) => t.assignee_id === currentUser.id && t.status !== 'done'
  ).length;

  return (
    <div
      data-density={densityMode}
      data-theme={themePreset}
      data-accent={accentColor}
      data-font={fontFamily}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className="flex h-screen w-screen flex-col overflow-hidden theme-app-bg text-slate-200 font-sans select-none antialiased"
    >
      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Center Workspace Viewport */}
        <div className="flex flex-1 flex-col overflow-hidden theme-surface-bg">
          {/* Desktop TopBar / Viewport Toolbar */}
          <TopBar />

          {/* Viewport Canvas */}
          <main className="flex-1 overflow-y-auto theme-app-bg p-5">
            <div className="mx-auto max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* 3. Desktop Native Bottom Status Bar */}
      <div className="flex h-6 w-full items-center justify-between border-t theme-border theme-titlebar-bg px-3 text-[11px] text-slate-400 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <Clock className={`h-3 w-3 ${isClockedIn ? 'text-emerald-400' : isShiftCompleted ? 'text-emerald-500' : 'text-blue-400'}`} />
            <span>
              {isShiftCompleted
                ? `SHIFT COMPLETED (${formatWorkingDuration(todayAtt?.clock_in, todayAtt?.clock_out)})`
                : isClockedIn
                ? `PUNCHED IN: ${formatWorkingDuration(todayAtt?.clock_in, null)}`
                : 'OFF-DUTY'}
            </span>
          </div>

          <span className="text-[#262c3b]">|</span>

          <span className="text-[10px] text-slate-400 font-mono">
            {pendingTasksCount} TASKS PENDING
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            title="Keyboard Shortcuts Hub (?)"
          >
            <kbd className="rounded bg-[#161a24] px-1 py-0.2 border border-[#232a38] text-slate-300">?</kbd>
            <span>Shortcuts</span>
          </button>
          <span className="text-[#262c3b]">|</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-[#161a24] px-1 py-0.2 border border-[#232a38] text-slate-300">Ctrl+K</kbd>
            <span>Command</span>
          </span>
          <span className="text-[#262c3b]">|</span>
          <span className="text-slate-300 capitalize">{currentUser.role.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Modals & Command Palette */}
      <LoginModal />
      <PunchLocationModal />
      <CommandPalette />
      <KeyboardShortcutsModal />
      <CreateTaskModal />
      <ApplyLeaveModal />
      <SubmitStandupModal />
      <ScheduleMeetingModal />

      {/* Non-blocking Notifications */}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className: 'border border-[#222837] bg-[#12151e] text-slate-100 text-xs shadow-2xl rounded-md',
        }}
      />
    </div>
  );
}
