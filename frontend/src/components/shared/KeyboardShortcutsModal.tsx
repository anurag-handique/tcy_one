import * as React from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Command,
  Keyboard,
  Clock,
  CheckSquare,
  Calendar,
  Coffee,
  Users,
  Building2,
  FileBarChart,
  Settings,
  PanelLeft,
} from 'lucide-react';

export function KeyboardShortcutsModal() {
  const { shortcutsModalOpen, setShortcutsModalOpen } = useUIStore();

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Win / Ctrl';

  const shortcutGroups = [
    {
      title: 'Global Actions',
      items: [
        { keys: [modKey, 'K'], label: 'Open Command Palette', icon: Command },
        { keys: ['?'], label: 'Keyboard Shortcuts Cheat Sheet', icon: Keyboard },
      ],
    },
    {
      title: 'Quick Operations',
      items: [
        { keys: [modKey, 'Shift', 'P'], label: 'Punch In / Clock Out', icon: Clock },
        { keys: [modKey, 'Shift', 'T'], label: 'Create New Task', icon: CheckSquare },
        { keys: [modKey, 'Shift', 'L'], label: 'Apply for Leave', icon: Coffee },
        { keys: [modKey, 'Shift', 'S'], label: 'Submit Daily Standup', icon: Calendar },
        { keys: [modKey, 'Shift', 'M'], label: 'Schedule Meeting', icon: Calendar },
      ],
    },
    {
      title: 'Navigation Chords (Press G, then key)',
      items: [
        { keys: ['G', 'D'], label: 'Go to Dashboard / My Day', icon: Command },
        { keys: ['G', 'A'], label: 'Go to Attendance & Punches', icon: Clock },
        { keys: ['G', 'T'], label: 'Go to Tasks Roster', icon: CheckSquare },
        { keys: ['G', 'P'], label: 'Go to Projects Board', icon: CheckSquare },
        { keys: ['G', 'L'], label: 'Go to Leave & Holidays', icon: Coffee },
        { keys: ['G', 'E'], label: 'Go to Employee Directory', icon: Users },
        { keys: ['G', 'O'], label: 'Go to Organization Hierarchy', icon: Building2 },
        { keys: ['G', 'R'], label: 'Go to Reports & Analytics', icon: FileBarChart },
        { keys: ['G', 'S'], label: 'Go to System Preferences', icon: Settings },
      ],
    },
  ];

  return (
    <Dialog open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen}>
      <DialogContent className="max-w-2xl bg-[#0e121a] border border-[#202838] p-0 shadow-2xl rounded-none text-slate-200">
        <DialogHeader className="p-4 border-b border-[#1c2333] bg-[#090c12]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Keyboard className="h-3.5 w-3.5" />
            </div>
            <div>
              <DialogTitle className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Keyboard Shortcuts Hub
              </DialogTitle>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Speed up your enterprise workflow with keyboard navigation and hotkeys
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4 text-xs font-mono">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-[#1b2230] pb-1">
                {group.title}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-2 bg-[#080b11] border border-[#18202d] hover:border-[#28344c] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="text-[11px] text-slate-200 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, idx) => (
                          <kbd
                            key={idx}
                            className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 bg-[#141926] text-blue-300 border border-[#252f44] text-[10px] font-bold shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#090c12] border-t border-[#1c2333] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Press <kbd className="px-1 bg-[#141926] border border-[#252f44] text-slate-300">Esc</kbd> to close</span>
          <span>TCY One Universal Shortcuts</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
