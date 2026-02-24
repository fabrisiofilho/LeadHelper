import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '@main/infrastructure/log/logger';

function resolveBuildIcon(filename: string) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', filename);
  }

  return path.join(app.getAppPath(), 'build', filename);
}

function getIconPath() {
  switch (process.platform) {
    case 'win32':
      return resolveBuildIcon('icon.ico');
    case 'darwin':
      return resolveBuildIcon('icon.icns');
    default:
      return resolveBuildIcon('icon.png');
  }
}

export const createMainWindow = (): BrowserWindow => {
  const preloadPath = path.join(__dirname, '../preload/index.js');

  logger.debug('__dirname:', __dirname);
  logger.debug('Preload path:', preloadPath);
  logger.debug('Preload exists:', fs.existsSync(preloadPath));

  if (!fs.existsSync(preloadPath)) {
    logger.error('PRELOAD NOT FOUND!');
    logger.debug('Contents of __dirname:', fs.readdirSync(__dirname));

    const parentDir = path.join(__dirname, '..');
    if (fs.existsSync(parentDir)) {
      logger.debug('Contents of parent directory:', fs.readdirSync(parentDir));
    }
  }

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    icon: getIconPath(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: true,
      sandbox: false,
    },
  });

  mainWindow.setMenu(null);

  globalShortcut.register('Control+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.webContents.openDevTools();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    logger.success('Window ready and visible');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logger.success('Page loaded');
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription) => {
      logger.error('Failed to load page:', errorCode, errorDescription);
    },
  );

  if (process.env.NODE_ENV === 'development') {
    const devServerUrl =
      process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
    logger.info(`Development mode - loading from ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch(logger.error);
    mainWindow.webContents.openDevTools();
  } else {
    logger.info('Production mode - loading local file');
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath).catch(logger.error);
  }

  return mainWindow;
};
