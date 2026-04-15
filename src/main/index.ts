process.env.TZ = 'America/Sao_Paulo';

import dotenv from 'dotenv';
import { app, dialog } from 'electron';
import { logger } from '@main/infrastructure/log/logger';
import { AppInitializer } from './infrastructure/boot/app-initializer';
import { setupLifecycle } from './infrastructure/boot/electron-lifecycle';

dotenv.config();

// Set the app name so native notifications show "LeadHelper" instead of "electron" or "Electron"
app.setName('LeadHelper');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.electron.leadhelper');
}
if (process.platform === 'linux') {
  app.setDesktopName('LeadHelper');
}

logger.info('Starting application initialization...');
logger.info('Platform:', process.platform);
logger.info('Environment:', process.env.NODE_ENV || 'production');

if (process.platform === 'linux' && process.getuid && process.getuid() === 0) {
  console.error('ERRO: Não execute o aplicativo como root (sudo)');
  console.error('Execute sem sudo: leadhelper');

  dialog.showErrorBox(
    'Erro de Permissão',
    'Não execute o aplicativo como root (sudo).\nExecute diretamente: leadhelper',
  );

  app.quit();
  process.exit(1);
}

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('no-sandbox');
  logger.info('Linux-specific flags enabled');
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  logger.error('Unhandled Rejection:', reason);
});

const initializer = new AppInitializer();

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.info('Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    logger.info('Second instance attempted, focusing main window');
    const mainWindow = initializer.getWindow();

    if (mainWindow) {
      mainWindow.show();
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      logger.info('Electron is ready, starting application...');
      logger.info('Platform:', process.platform);
      logger.info('Architecture:', process.arch);
      logger.info('Node version:', process.version);
      logger.info('Electron version:', process.versions.electron);
      logger.info('Chrome version:', process.versions.chrome);
      logger.info('Environment:', process.env.NODE_ENV || 'production');
      logger.info('App path:', app.getAppPath());
      logger.info('User data:', app.getPath('userData'));

      logger.info('Initializing application components...');
      const mainWindow = await initializer.init();

      if (!mainWindow) {
        throw new Error('Failed to create main window');
      }

      logger.info('Main window created successfully');

      setupLifecycle(() => initializer.getWindow());

      mainWindow.webContents.on('did-finish-load', () => {
        logger.info('Renderer process loaded successfully');
        logger.success('Renderer process loaded');
      });

      mainWindow.webContents.on(
        'did-fail-load',
        (_event, errorCode, errorDescription) => {
          console.error(
            'Failed to load renderer:',
            errorCode,
            errorDescription,
          );
          logger.error('Failed to load renderer:', {
            errorCode,
            errorDescription,
          });
        },
      );

      logger.info('Application fully started and ready!');
    } catch (error) {
      console.error('FATAL: Failed to initialize application');
      console.error(error);
      logger.error('Failed to initialize application:', error);

      const errorMessage =
        error instanceof Error
          ? `${error.message}\n\n${error.stack || 'No stack trace'}`
          : String(error);

      dialog.showErrorBox(
        'Erro ao Iniciar Aplicação',
        `Não foi possível inicializar a aplicação.\n\n${errorMessage}\n\nVerifique:\n- Permissões de escrita\n- Espaço em disco\n- Antivírus não está bloqueando`,
      );

      app.quit();
      process.exit(1);
    }
  });

  app.on('activate', () => {
    logger.info('App activated');
    const win = initializer.getWindow();
    if (win) {
      win.show();
      win.focus();
    } else {
      logger.info('No window exists, reinitializing...');
      initializer.init().catch((error) => {
        console.error('Failed to reinitialize:', error);
        logger.error('Failed to reinitialize:', error);
      });
    }
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    logger.info('Application is quitting...');
  });

  app.on('will-quit', () => {
    logger.info('Application will quit');
  });

  app.on('quit', (_event, exitCode) => {
    logger.info('Application quit with code:', exitCode);
  });
}

if (process.env.NODE_ENV === 'development') {
  logger.info('DEVELOPMENT MODE');
  logger.info('- Database synchronize: ENABLED');
  logger.info('- Detailed logging: ENABLED');
  logger.info('- DevTools: ENABLED');
}
