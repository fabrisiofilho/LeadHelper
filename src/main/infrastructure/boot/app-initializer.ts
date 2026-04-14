import { BrowserWindow, app } from 'electron';
import { setDatabasePath, initializeDatabase } from '../database/data-source';
import { resolveAndSetupDbPath } from './db-path-resolver';
import { createMainWindow } from './window';
import {
  loadIpcControllers,
  setSyncControllerWindow,
  startAutoSync,
} from '../../application/controllers/config/index';
import {
  logger,
  configureLogger,
  LogLevel,
} from '@main/infrastructure/log/logger';
import { AutoUpdaterService } from '../auto-updater/auto-updater-service';

export class AppInitializer {
  private mainWindow: BrowserWindow | null = null;

  async init(): Promise<BrowserWindow> {
    try {
      const isProduction = app.isPackaged;
      configureLogger({
        writeToFile: isProduction,
        consoleLevel: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
        fileLevel: LogLevel.INFO,
      });

      logger.info('Starting application...');
      logger.info(
        `Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`,
      );
      logger.info(`App path: ${app.getAppPath()}`);
      logger.info(`User data path: ${app.getPath('userData')}`);
      logger.info(`Resources path: ${process.resourcesPath}`);

      const dbPath = resolveAndSetupDbPath();
      logger.info('Database path resolved:', dbPath);

      setDatabasePath(dbPath);
      logger.info('Database path configured');

      process.env.USER_DATA_PATH = app.getPath('userData');

      await initializeDatabase();
      logger.success('Database initialized');

      loadIpcControllers();

      this.mainWindow = createMainWindow();

      // Set main window for sync progress and start auto-sync
      setSyncControllerWindow(this.mainWindow);
      startAutoSync();

      const autoUpdater = AutoUpdaterService.getInstance();
      autoUpdater.setMainWindow(this.mainWindow);

      if (isProduction) {
        autoUpdater.startPeriodicCheck(30);
      }

      logger.success('Application initialized successfully');

      return this.mainWindow;
    } catch (error) {
      logger.error('FATAL: Failed to initialize application', error);

      if (error instanceof Error) {
        logger.error('Error message:', error.message);
        logger.error('Error stack:', error.stack);
      }

      throw error;
    }
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up application...');

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.close();
        logger.info('Main window closed');
      }

      logger.success('Application cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }
}
