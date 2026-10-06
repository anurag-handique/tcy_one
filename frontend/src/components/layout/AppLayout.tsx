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
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatWorkingDuration } from '@/lib/utils';
import {
  Minus,
  Square,
  X,
  Wifi,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  Command,
  Database,
  Building2,
} from 'lucide-react';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { attendance, tasks } = useDataStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.find(
    (a) => a.employee_id === currentUser.id && a.date === todayStr
  );
  const isClockedIn = Boolean(todayAtt && !todayAtt.clock_out);

  const pendingTasksCount = tasks.filter(
    (t) => t.assignee_id === currentUser.id && t.status !== 'done'
  ).length;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d13] text-slate-200 font-sans select-none antialiased">
      {/* 1. Desktop Window Native TitleBar */}
      <div className="desktop-titlebar flex h-8 w-full items-center justify-between border-b border-[#1b202c] bg-[#0c0e15] px-3 text-[11px] text-slate-400 z-50">
        {/* Left: App Identity */}
        <div className="flex items-center gap-2 desktop-no-drag">
          <img
            src="/favicon (1).ico"
            alt="TCY"
            className="h-4 w-4 shrink-0 rounded-sm object-contain"
          />
          <span className="text-xs font-mono tracking-tight">
            <span className="font-extrabold text-white">TCY</span>{' '}
            <span className="font-semibold text-blue-400">One</span>
          </span>
          <span className="text-[#3b4356]">/</span>
          <span className="text-slate-400 font-mono text-[10px]">v1.0.4</span>
        </div>

        {/* Center: Empty Title Bar spacer */}
        <div className="flex-1" />

        {/* Right: Window Controls */}
        <div className="flex items-center desktop-no-drag">
          <button
            className="flex h-8 w-9 items-center justify-center text-slate-400 hover:bg-[#181d28] hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            className="flex h-8 w-9 items-center justify-center text-slate-400 hover:bg-[#181d28] hover:text-white transition-colors"
            title="Maximize / Restore"
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            className="flex h-8 w-9 items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Center Workspace Viewport */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0e1118]">
          {/* Desktop TopBar / Viewport Toolbar */}
          <TopBar />

          {/* Viewport Canvas */}
          <main className="flex-1 overflow-y-auto bg-[#0b0d13] p-5">
            <div className="mx-auto max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* 3. Desktop Native Bottom Status Bar */}
      <div className="flex h-6 w-full items-center justify-between border-t border-[#1b202c] bg-[#0c0e15] px-3 text-[11px] text-slate-400 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <Clock className="h-3 w-3 text-blue-400" />
            <span>
              {isClockedIn ? `PUNCHED IN: ${formatWorkingDuration(todayAtt?.clock_in, null)}` : 'OFF-DUTY'}
            </span>
          </div>

          <span className="text-[#262c3b]">|</span>

          <span className="text-[10px] text-slate-400 font-mono">
            {pendingTasksCount} TASKS PENDING
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-[#161a24] px-1 py-0.2 border border-[#232a38] text-slate-300">Ctrl+K</kbd>
            <span>Command Palette</span>
          </span>
          <span className="text-[#262c3b]">|</span>
          <span>UTF-8</span>
          <span className="text-[#262c3b]">|</span>
          <span className="text-slate-300 capitalize">{currentUser.role.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Modals & Command Palette */}
      <LoginModal />
      <PunchLocationModal />
      <CommandPalette />
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
