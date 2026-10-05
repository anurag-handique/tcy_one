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
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <Command className="w-full">
          <div className="flex items-center border-b border-slate-800 px-4">
            <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
            <Command.Input
              placeholder="Type a command or search employees, tasks, projects..."
              className="flex h-13 w-full bg-transparent py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              autoFocus
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 sm:flex">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-400">
              No matching results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-semibold text-slate-400">
              <Command.Item
                onSelect={() => runCommand(() => setTaskModalOpen(true))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <CheckSquare className="h-4 w-4 text-blue-400" />
                <span>Create New Task</span>
                <span className="ml-auto text-xs opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setLeaveModalOpen(true))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>Apply for Leave</span>
                <span className="ml-auto text-xs opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setStandupModalOpen(true))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Submit Daily Standup</span>
                <span className="ml-auto text-xs opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setMeetingModalOpen(true))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Video className="h-4 w-4 text-emerald-400" />
                <span>Schedule Team Meeting</span>
                <span className="ml-auto text-xs opacity-60">Action</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => logout())}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-300 cursor-pointer hover:bg-rose-600 hover:text-white transition-colors aria-selected:bg-rose-600 aria-selected:text-white"
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Log Out / Exit Console</span>
                <span className="ml-auto text-xs opacity-60 font-mono">Session</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-semibold text-slate-400 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Layers className="h-4 w-4" />
                <span>Go to My Day Dashboard</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/tasks'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <FolderKanban className="h-4 w-4" />
                <span>Tasks & Kanban Board</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/attendance'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Clock className="h-4 w-4" />
                <span>Attendance & Timesheets</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/team'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Users className="h-4 w-4" />
                <span>Team Directory & Hierarchy</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/reports'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <FileText className="h-4 w-4" />
                <span>Reports & Analytics</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate('/settings'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
              >
                <Settings className="h-4 w-4" />
                <span>System Settings & Preferences</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Command.Item>
            </Command.Group>

            {/* Team Members */}
            <Command.Group heading="Team Members" className="px-2 py-1.5 text-xs font-semibold text-slate-400 mt-2">
              {profiles.map((p) => (
                <Command.Item
                  key={p.id}
                  onSelect={() => runCommand(() => navigate(`/team`))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
                >
                  <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium">
                    {p.full_name[0]}
                  </div>
                  <span>{p.full_name}</span>
                  <span className="text-xs text-slate-400 ml-1">({p.role})</span>
                  <span className="ml-auto text-xs opacity-60">{p.email}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Active Projects */}
            <Command.Group heading="Projects" className="px-2 py-1.5 text-xs font-semibold text-slate-400 mt-2">
              {projects.map((proj) => (
                <Command.Item
                  key={proj.id}
                  onSelect={() => runCommand(() => navigate('/projects'))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors aria-selected:bg-blue-600 aria-selected:text-white"
                >
                  <FolderKanban className="h-4 w-4 text-blue-400" />
                  <span>{proj.name}</span>
                  <span className="ml-auto text-xs font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {proj.code}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-xs text-slate-500 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <span>Use <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-400">↑</kbd> <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-400">↓</kbd> to navigate</span>
              <span>•</span>
              <span><kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-400">Enter</kbd> to select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src="/favicon (1).ico" alt="TCY" className="h-3.5 w-3.5 object-contain" />
              <span className="font-mono text-slate-400">
                <span className="text-white font-bold">TCY</span> <span className="text-blue-400 font-medium">One</span> Actions
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
