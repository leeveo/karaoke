const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer } = require('../server');

const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);
const SERVER_PORT = Number(process.env.KARAOKE_OFFLINE_PORT || process.env.PORT || 3210);
let httpServer = null;
let offlineRootCache = null;
let manifestCache = null;

function resolveOfflineRoot() {
  if (offlineRootCache) {
    return offlineRootCache;
  }

  const explicit = process.env.OFFLINE_PACKAGE_ROOT;
  if (explicit && fs.existsSync(explicit)) {
    offlineRootCache = path.resolve(explicit);
    return offlineRootCache;
  }

  const candidate = path.join(projectRoot, 'offline-data');
  if (!fs.existsSync(candidate)) {
    return null;
  }

  const children = fs
    .readdirSync(candidate)
    .map((entry) => path.join(candidate, entry))
    .filter((entry) => fs.statSync(entry).isDirectory());

  offlineRootCache = children[0] || candidate;
  return offlineRootCache;
}

function loadManifest() {
  if (manifestCache) {
    return manifestCache;
  }
  const root = resolveOfflineRoot();
  if (!root) {
    return null;
  }
  const manifestPath = path.join(root, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    manifestCache = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return manifestCache;
  } catch (error) {
    console.warn('[OfflineShell] Unable to parse manifest:', error.message);
    return null;
  }
}

async function bootServer() {
  if (httpServer) {
    return httpServer;
  }
  const offlineRoot = resolveOfflineRoot();
  httpServer = await startServer({
    port: SERVER_PORT,
    dir: projectRoot,
    offlineRoot,
  });
  return httpServer;
}

function createWindow() {
  const manifest = loadManifest();
  const eventPath = manifest?.event?.id ? `/event/${manifest.event.id}` : '/';

  // Grant camera and microphone permissions automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications'];
    if (allowedPermissions.includes(permission)) {
      console.log('[OfflineShell] Granting permission:', permission);
      callback(true);
    } else {
      console.log('[OfflineShell] Denying permission:', permission);
      callback(false);
    }
  });

  // Also handle permission check (for getUserMedia)
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = ['media', 'mediaKeySystem'];
    return allowedPermissions.includes(permission);
  });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#050505',
    autoHideMenuBar: true,
    title: manifest?.event?.name || 'Karaoke Offline',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const targetUrl = `http://localhost:${SERVER_PORT}${eventPath}`;
  mainWindow.loadURL(targetUrl);
}

async function startApp() {
  try {
    await bootServer();
    createWindow();
  } catch (error) {
    console.error('[OfflineShell] Fatal startup error:', error);
    app.quit();
  }
}

app.whenReady().then(startApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
