import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DensityMode = 'comfortable' | 'compact' | 'ultra';
export type ThemePreset = 'obsidian' | 'midnight' | 'matrix' | 'amethyst';
export type AccentColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';
export type FontFamily = 'sans' | 'mono' | 'system';

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  densityMode: DensityMode;
  themePreset: ThemePreset;
  accentColor: AccentColor;
  fontFamily: FontFamily;
  reducedMotion: boolean;
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
  setShortcutsModalOpen: (open: boolean) => void;
  setDensityMode: (mode: DensityMode) => void;
  setThemePreset: (preset: ThemePreset) => void;
  setAccentColor: (accent: AccentColor) => void;
  setFontFamily: (font: FontFamily) => void;
  setReducedMotion: (enabled: boolean) => void;
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
      shortcutsModalOpen: false,
      densityMode: 'comfortable',
      themePreset: 'obsidian',
      accentColor: 'blue',
      fontFamily: 'sans',
      reducedMotion: false,
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
      setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
      setDensityMode: (mode) => set({ densityMode: mode }),
      setThemePreset: (preset) => set({ themePreset: preset }),
      setAccentColor: (accent) => set({ accentColor: accent }),
      setFontFamily: (font) => set({ fontFamily: font }),
      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
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
        themePreset: state.themePreset,
        accentColor: state.accentColor,
        fontFamily: state.fontFamily,
        reducedMotion: state.reducedMotion,
      }),
    }
  )
);
