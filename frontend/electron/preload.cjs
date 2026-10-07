// ==============================================================================
// TCY WORKHUB — ELECTRON PRELOAD SCRIPT
// ==============================================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  sendNotification: (payload) => ipcRenderer.invoke('show-native-notification', payload),
});
