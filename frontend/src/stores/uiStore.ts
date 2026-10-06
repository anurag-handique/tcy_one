import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  densityMode: 'comfortable' | 'compact';
  networkStatus: 'online' | 'reconnecting' | 'offline';
  activeLeaveModalOpen: boolean;
  activeTaskModalOpen: boolean;
  activeStandupModalOpen: boolean;
  activeMeetingModalOpen: boolean;
  activePunchModalOpen: boolean;
  punchModalMode: 'in' | 'out';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDensityMode: (mode: 'comfortable' | 'compact') => void;
  setNetworkStatus: (status: 'online' | 'reconnecting' | 'offline') => void;
  setLeaveModalOpen: (open: boolean) => void;
  setTaskModalOpen: (open: boolean) => void;
  setStandupModalOpen: (open: boolean) => void;
  setMeetingModalOpen: (open: boolean) => void;
  setPunchModalOpen: (open: boolean, mode?: 'in' | 'out') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      densityMode: 'comfortable',
      networkStatus: 'online',
      activeLeaveModalOpen: false,
      activeTaskModalOpen: false,
      activeStandupModalOpen: false,
      activeMeetingModalOpen: false,
      activePunchModalOpen: false,
      punchModalMode: 'in',

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setDensityMode: (mode) => set({ densityMode: mode }),
      setNetworkStatus: (status) => set({ networkStatus: status }),
      setLeaveModalOpen: (open) => set({ activeLeaveModalOpen: open }),
      setTaskModalOpen: (open) => set({ activeTaskModalOpen: open }),
      setStandupModalOpen: (open) => set({ activeStandupModalOpen: open }),
      setMeetingModalOpen: (open) => set({ activeMeetingModalOpen: open }),
      setPunchModalOpen: (open, mode = 'in') => set({ activePunchModalOpen: open, punchModalMode: mode }),
    }),
    {
      name: 'tcy_ui_storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        densityMode: state.densityMode,
      }),
    }
  )
);
