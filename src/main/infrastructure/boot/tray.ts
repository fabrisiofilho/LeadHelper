import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { logger } from '@main/infrastructure/log/logger';

let tray: Tray | null = null;

function getTrayIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', 'icon.png');
  }
  return path.join(app.getAppPath(), 'build', 'icon.png');
}

/**
 * Creates the system tray icon and context menu.
 * When the user closes the window, it minimizes to tray instead of quitting.
 */
export function setupTray(getWindow: () => BrowserWindow | null): Tray {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  // Resize for tray (16x16 on most platforms)
  const trayIcon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('LeadHelper');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir LeadHelper',
      click: () => {
        const win = getWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        const win = getWindow();
        if (win) {
          // Remove the close handler so the window actually closes
          win.removeAllListeners('close');
          win.destroy();
        }
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click on tray icon restores the window
  tray.on('double-click', () => {
    const win = getWindow();
    if (win) {
      win.show();
      win.focus();
    }
  });

  logger.info('[Tray] System tray icon created');
  return tray;
}

/**
 * Configures the window to minimize to tray on close instead of quitting.
 */
export function setupMinimizeToTray(window: BrowserWindow): void {
  window.on('close', (event) => {
    // Prevent the window from actually closing — just hide it
    if (!app.isQuitting) {
      event.preventDefault();
      window.hide();
      logger.info('[Tray] Window hidden to system tray');
    }
  });
}

// Allow the app to mark itself as quitting so the close handler lets it through
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}
