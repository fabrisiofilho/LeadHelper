import { app, BrowserWindow } from 'electron';
import { closeDatabase } from '../database/data-source';
import { logger } from '@main/infrastructure/log/logger';

export function setupLifecycle(getWindow: () => BrowserWindow | null): void {
  logger.info('Setting up application lifecycle...');

  app.on('window-all-closed', async () => {
    logger.info('All windows closed');

    // On macOS, apps stay active until explicitly quit
    // On other platforms, only quit if the app is actually quitting (not just hidden to tray)
    if (process.platform !== 'darwin' && app.isQuitting) {
      try {
        await closeDatabase();
        logger.info('Application quitting...');
        app.quit();
      } catch (error) {
        logger.error('Error during cleanup:', error);
        app.quit();
      }
    }
  });

  app.on('before-quit', async (event) => {
    logger.info('Application is preparing to quit...');
    app.isQuitting = true;

    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    try {
      await closeDatabase();

      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.destroy();
        }
      });

      logger.success('Cleanup completed successfully');

      app.exit(0);
    } catch (error) {
      logger.error('Error during cleanup:', error);
      app.exit(1);
    }
  });

  app.on('activate', () => {
    logger.info('App activated');

    if (BrowserWindow.getAllWindows().length === 0) {
      const currentWindow = getWindow();
      if (!currentWindow) {
        logger.info('No window exists, needs reinitialization');
      }
    }
  });

  app.on('will-quit', () => {
    logger.info('Application will quit');
  });

  app.on('quit', (_event, exitCode) => {
    logger.info('Application quit with code:', exitCode);
  });

  logger.success('Lifecycle configured');
}
