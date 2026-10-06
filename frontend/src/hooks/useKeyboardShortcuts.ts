import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const {
    setCommandPaletteOpen,
    setShortcutsModalOpen,
    setTaskModalOpen,
    setLeaveModalOpen,
    setStandupModalOpen,
    setMeetingModalOpen,
    setPunchModalOpen,
    toggleSidebar,
  } = useUIStore();

  // For 2-key chord navigation like 'g' then 'd'
  const lastKeyRef = React.useRef<{ key: string; time: number } | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing in form inputs, textareas, or contenteditables
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Check modifier key: Supports Windows Key (e.metaKey), Command Key (e.metaKey on Mac), and Ctrl Key
      const cmdOrCtrl = Boolean(e.metaKey || e.ctrlKey);

      // 1. Command Palette & Search: Windows+K / Meta+K / Ctrl+K / Cmd+K
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // 2. Toggle Left Sidebar: Windows+B / Ctrl+B / Cmd+B
      if (cmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // If typing in input, skip single keys or shift chords
      if (isInput) return;

      // 3. Shortcuts Modal: '?' or Shift+'/'
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen(true);
        return;
      }

      // 4. Action Hotkeys (Ctrl+Shift+key)
      if (cmdOrCtrl && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'p': // Punch In / Punch Out
            e.preventDefault();
            setPunchModalOpen(true);
            return;
          case 't': // New Task
            e.preventDefault();
            setTaskModalOpen(true);
            return;
          case 'l': // Apply Leave
            e.preventDefault();
            setLeaveModalOpen(true);
            return;
          case 's': // Daily Standup
            e.preventDefault();
            setStandupModalOpen(true);
            return;
          case 'm': // Schedule Meeting
            e.preventDefault();
            setMeetingModalOpen(true);
            return;
        }
      }

      // 5. Navigation chords: 'g' followed by target key within 1.2s
      const now = Date.now();
      if (lastKeyRef.current && lastKeyRef.current.key === 'g' && now - lastKeyRef.current.time < 1200) {
        const chordKey = e.key.toLowerCase();
        lastKeyRef.current = null;

        switch (chordKey) {
          case 'd': // Dashboard / My Day
            e.preventDefault();
            navigate('/');
            toast('Navigated to Dashboard', { duration: 1200 });
            return;
          case 'a': // Attendance
            e.preventDefault();
            navigate('/attendance');
            toast('Navigated to Attendance', { duration: 1200 });
            return;
          case 't': // Tasks
            e.preventDefault();
            navigate('/tasks');
            toast('Navigated to Tasks', { duration: 1200 });
            return;
          case 'p': // Projects
            e.preventDefault();
            navigate('/projects');
            toast('Navigated to Projects', { duration: 1200 });
            return;
          case 'l': // Leave
            e.preventDefault();
            navigate('/leave');
            toast('Navigated to Leave & Time Off', { duration: 1200 });
            return;
          case 'e': // Team / Employees
            e.preventDefault();
            navigate('/team');
            toast('Navigated to Employee Directory', { duration: 1200 });
            return;
          case 'o': // Organization
            e.preventDefault();
            navigate('/organization');
            toast('Navigated to Organization', { duration: 1200 });
            return;
          case 'r': // Reports
            e.preventDefault();
            navigate('/reports');
            toast('Navigated to Reports', { duration: 1200 });
            return;
          case 's': // Settings
            e.preventDefault();
            navigate('/settings');
            toast('Navigated to System Preferences', { duration: 1200 });
            return;
        }
      }

      // Record 'g' for next key chord
      if (e.key.toLowerCase() === 'g' && !cmdOrCtrl && !e.altKey && !e.shiftKey) {
        lastKeyRef.current = { key: 'g', time: now };
      } else {
        lastKeyRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    navigate,
    setCommandPaletteOpen,
    setShortcutsModalOpen,
    setTaskModalOpen,
    setLeaveModalOpen,
    setStandupModalOpen,
    setMeetingModalOpen,
    setPunchModalOpen,
    toggleSidebar,
  ]);
}
