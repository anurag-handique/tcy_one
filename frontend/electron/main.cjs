// ==============================================================================
// TCY WORKHUB — ELECTRON MAIN PROCESS (WINDOWS & MACOS DESKTOP PACKAGING)
// ==============================================================================

const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');

// Prevent multiple instances of the desktop application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  const iconPath = path.join(__dirname, '../public/app-icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0B0D13',
    icon: iconPath,
    autoHideMenuBar: true,
    title: 'TCY One — Enterprise Workspace',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true, // Native window frame & controls
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Open external links in user's default browser instead of Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window Management IPC Handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('show-native-notification', (event, { title, body, subtitle }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: title || 'TCY One Notification',
      body: body || '',
      subtitle: subtitle || '',
      icon: path.join(__dirname, '../public/app-icon.png'),
    });
    notif.show();
    return true;
  }
  return false;
});

// App Lifecycle
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
