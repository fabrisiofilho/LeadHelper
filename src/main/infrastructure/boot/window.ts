import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  MenuItem,
  shell,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '@main/infrastructure/log/logger';

/**
 * Workaround for Chromium bug on Windows where dragging/resizing the window
 * enters a native modal loop that blocks the Node.js event loop, freezing
 * the renderer process (UI freeze).
 *
 * The fix: pump the event loop manually with a high-frequency setInterval
 * while the user is moving or resizing the window.
 *
 * See: https://github.com/electron/electron/issues/9539
 */
function applyWindowDragFix(win: BrowserWindow): void {
  if (process.platform !== 'win32') return;

  let resizeInterval: ReturnType<typeof setInterval> | null = null;

  const startPumping = (): void => {
    if (resizeInterval) return;
    // ~60 fps keeps the event loop alive during the native modal loop
    resizeInterval = setInterval(() => {
      // no-op: the mere existence of the timer callback keeps Node's event loop ticking
    }, 1000 / 60);
  };

  const stopPumping = (): void => {
    if (resizeInterval) {
      clearInterval(resizeInterval);
      resizeInterval = null;
    }
  };

  win.on('will-move', startPumping);
  win.on('will-resize', startPumping);

  // The 'moved' and 'resized' events fire once the native modal loop ends
  win.on('moved', stopPumping);
  win.on('resized', stopPumping);

  // Safety net: also stop when the window loses focus or is destroyed
  win.on('blur', stopPumping);
  win.on('closed', stopPumping);

  logger.info('Window drag/resize freeze fix applied (Windows)');
}

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
      spellcheck: true,
    },
  });

  mainWindow.setMenu(null);

  // ── External link interception ─────────────────────────────────────────────
  // Any URL that is NOT the local dev server or the local renderer file is
  // considered external and must open in the system browser instead of
  // navigating the Electron window itself.
  const isInternalUrl = (url: string): boolean => {
    if (process.env.NODE_ENV === 'development') {
      const devUrl =
        process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
      return url.startsWith(devUrl);
    }
    // Production: only local file:// URLs are internal
    return url.startsWith('file://');
  };

  // Prevent the window from navigating away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
      logger.debug(
        '[window] External navigation intercepted → system browser:',
        url,
      );
    }
  });

  // Prevent target="_blank" and window.open() from opening inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url)) {
      shell.openExternal(url);
      logger.debug('[window] window.open intercepted → system browser:', url);
    }
    return { action: 'deny' }; // always deny opening a new Electron window
  });
  // ───────────────────────────────────────────────────────────────────────────

  // Apply Windows drag/resize freeze fix
  applyWindowDragFix(mainWindow);

  // Configurar corretor ortográfico para Português do Brasil
  mainWindow.webContents.session.setSpellCheckerLanguages(['pt-BR']);

  // Menu de contexto com sugestões de correção ortográfica
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();

    // Adicionar sugestões de correção se a palavra estiver errada
    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          menu.append(
            new MenuItem({
              label: suggestion,
              click: () =>
                mainWindow.webContents.replaceMisspelling(suggestion),
            }),
          );
        }
      } else {
        menu.append(
          new MenuItem({
            label: 'Sem sugestões',
            enabled: false,
          }),
        );
      }

      menu.append(new MenuItem({ type: 'separator' }));

      // Opção para adicionar a palavra ao dicionário
      menu.append(
        new MenuItem({
          label: `Adicionar "${params.misspelledWord}" ao dicionário`,
          click: () =>
            mainWindow.webContents.session.addWordToSpellCheckerDictionary(
              params.misspelledWord,
            ),
        }),
      );

      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Ações padrão de edição (apenas em campos editáveis)
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Recortar', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Copiar', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Colar', role: 'paste' }));
      menu.append(
        new MenuItem({ label: 'Selecionar Tudo', role: 'selectAll' }),
      );
    } else if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copiar', role: 'copy' }));
    }

    if (menu.items.length > 0) {
      menu.popup();
    }
  });

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
    mainWindow.loadURL(devServerUrl).catch((e) => logger.error(e));
    mainWindow.webContents.openDevTools();
  } else {
    logger.info('Production mode - loading local file');
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath).catch((e) => logger.error(e));
  }

  return mainWindow;
};
