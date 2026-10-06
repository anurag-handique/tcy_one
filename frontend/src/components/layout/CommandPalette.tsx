import * as React from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  Calendar,
  CheckSquare,
  Users,
  FolderKanban,
  Video,
  FileText,
  Settings,
  Sparkles,
  Layers,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setLeaveModalOpen, setTaskModalOpen, setStandupModalOpen, setMeetingModalOpen } = useUIStore();
  const { tasks, projects, profiles } = useDataStore();
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const runCommand = (action: () => void) => {
    setCommandPaletteOpen(false);
    action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-sm animate-in fade-in-0">
      <div
        className="fixed inset-0"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-none border border-[#1f2637] bg-[#0c1018] shadow-2xl">
        <Command className="w-full">
          <div className="flex items-center border-b border-[#18202d] px-3">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-10 w-full bg-transparent py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono"
              autoFocus
            />
            <kbd className="pointer-events-none hidden h-4 select-none items-center gap-1 rounded-none border border-[#262d3e] bg-[#141824] px-1 font-mono text-[9px] font-medium text-slate-400 sm:flex">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-1.5 font-mono">
            <Command.Empty className="py-5 text-center text-xs text-slate-500">
              No matching results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
              <Command.Item
                onSelect={() => runCommand(() => setTaskModalOpen(true))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                <span>Create New Task</span>
                <span className="ml-auto text-[10px] opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setLeaveModalOpen(true))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span>Apply for Leave</span>
                <span className="ml-auto text-[10px] opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setStandupModalOpen(true))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Submit Daily Standup</span>
                <span className="ml-auto text-[10px] opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setMeetingModalOpen(true))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Video className="h-3.5 w-3.5 text-emerald-400" />
                <span>Schedule Team Meeting</span>
                <span className="ml-auto text-[10px] opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => logout())}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-rose-300 cursor-pointer hover:bg-rose-600 hover:text-white transition-colors aria-selected:bg-rose-600 aria-selected:text-white"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>Log Out / Exit Console</span>
                <span className="ml-auto text-[10px] opacity-60">Session</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500 mt-1.5">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>My Day Dashboard</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/tasks'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Tasks & Kanban</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/attendance'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Attendance & Timesheets</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/team'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Team Directory</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/organization'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Departments & Designations</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/reports'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Reports & Analytics</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/settings'))}
                className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>System Preferences</span>
                <ArrowRight className="ml-auto h-3 w-3 opacity-60" />
              </Command.Item>
            </Command.Group>

            {/* Active Projects */}
            <Command.Group heading="Projects" className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500 mt-1.5">
              {projects.map((proj) => (
                <Command.Item
                  key={proj.id}
                  onSelect={() => runCommand(() => navigate('/projects'))}
                  className="flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
                >
                  <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                  <span>{proj.name}</span>
                  <span className="ml-auto text-[10px] font-mono uppercase bg-[#182030] px-1.5 py-0.2 rounded-none text-slate-300 border border-[#232d42]">
                    {proj.code}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-[#18202d] px-3 py-1.5 text-[10px] text-slate-500 bg-[#080b11] font-mono">
            <div className="flex items-center gap-1.5">
              <span>Use <kbd className="rounded-none bg-[#141824] px-1 py-0.2 border border-[#222837] text-slate-400">↑</kbd> <kbd className="rounded-none bg-[#141824] px-1 py-0.2 border border-[#222837] text-slate-400">↓</kbd></span>
              <span>•</span>
              <span><kbd className="rounded-none bg-[#141824] px-1 py-0.2 border border-[#222837] text-slate-400">Enter</kbd></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white font-bold">TCY</span> <span className="text-blue-400">Actions</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
