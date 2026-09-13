const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow;
let backendProcess = null;

// Ensure persistent AppData directory for business database
function setupPersistentDataDirectory() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'dev.db');
  // Copy default template database if db does not exist in AppData
  if (!fs.existsSync(dbPath)) {
    const templateDb = path.join(__dirname, '../../packages/database/prisma/dev.db');
    const altTemplateDb = path.join(__dirname, 'dev.db');
    const sourceDb = fs.existsSync(templateDb) ? templateDb : (fs.existsSync(altTemplateDb) ? altTemplateDb : null);
    if (sourceDb) {
      try {
        fs.copyFileSync(sourceDb, dbPath);
        console.log(`Initialized business database template at: ${dbPath}`);
      } catch (e) {
        console.error('Database copy error:', e);
      }
    }
  }

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.PORT = process.env.PORT || '5000';
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  return dbPath;
}

// Start internal backend Express server process in production mode
function startBackendServer() {
  if (isDev) return; // In dev mode, background task handles dev:backend

  const dbPath = setupPersistentDataDirectory();
  const backendScript = path.join(__dirname, '../backend/dist/server.js');
  const altBackendScript = path.join(__dirname, 'server.js');
  const scriptToRun = fs.existsSync(backendScript) ? backendScript : (fs.existsSync(altBackendScript) ? altBackendScript : null);

  if (scriptToRun) {
    try {
      backendProcess = fork(scriptToRun, [], {
        env: {
          ...process.env,
          DATABASE_URL: `file:${dbPath}`,
          PORT: '5000',
          NODE_ENV: 'production'
        },
        silent: false
      });

      backendProcess.on('error', (err) => {
        console.error('Internal backend process error:', err);
      });
      console.log('Internal production backend server started successfully.');
    } catch (err) {
      console.error('Failed to spawn internal backend server:', err);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    title: 'CITY LINK (Engineering & Services) - Enterprise System',
    icon: path.join(__dirname, 'build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, connect to server on port 5000
    mainWindow.loadURL('http://localhost:5000').catch(() => {
      // Retry loading after server startup delay
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:5000');
      }, 2000);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startBackendServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Native Print Spooler Channel
ipcMain.handle('print-spool', async (event, options) => {
  if (!mainWindow) return { success: false, error: 'No main window active' };
  
  return new Promise((resolve) => {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      color: true,
      margins: { marginType: 'default' },
      ...options
    }, (success, failureReason) => {
      if (success) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: failureReason });
      }
    });
  });
});

// File Save Dialog Spooler
ipcMain.handle('save-file-dialog', async (event, { defaultName, title, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: title || 'Export Document',
    defaultPath: path.join(app.getPath('downloads'), defaultName || 'export'),
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });

  if (result.canceled) {
    return { success: false, path: null };
  }
  return { success: true, path: result.filePath };
});
