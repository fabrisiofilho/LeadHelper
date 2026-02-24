import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '@main/infrastructure/log/logger';

function isDevelopmentMode(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (
    process.defaultApp ||
    /node_modules[\\/]electron[\\/]/.test(process.execPath)
  ) {
    return true;
  }

  const appPath = app.getAppPath();
  if (
    appPath.includes('\\out\\') ||
    appPath.includes('/out/') ||
    appPath.includes('\\src\\') ||
    appPath.includes('/src/')
  ) {
    return true;
  }

  return false;
}

export function resolveAndSetupDbPath(): string {
  const isDev = isDevelopmentMode();
  let dbPath: string;

  if (isDev) {
    // Use app.getAppPath() as base to ensure consistency
    const appPath = app.getAppPath();
    // In dev, appPath points to the project root or out folder
    let projectRoot = appPath;

    // If we're in out folder, go up to project root
    if (appPath.includes('out')) {
      projectRoot = path.resolve(appPath, '..');
      if (projectRoot.endsWith('out')) {
        projectRoot = path.resolve(projectRoot, '..');
      }
    }

    dbPath = path.join(projectRoot, 'database', 'leadhelper.db');
    logger.info('[DEV] App path:', appPath);
    logger.info('[DEV] Project root:', projectRoot);
    logger.info('[DEV] Using local database path:', dbPath);
  } else {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'database', 'leadhelper.db');

    logger.info('[PROD] Using userData path:', userDataPath);
    logger.info('[PROD] Database will be at:', dbPath);
  }

  const dbDir = path.dirname(dbPath);

  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info('Database directory created:', dbDir);
    } else {
      logger.info('Database directory already exists:', dbDir);
    }

    fs.accessSync(dbDir, fs.constants.W_OK);
    logger.info('Database directory is writable');
  } catch (error) {
    logger.error('Error with database directory:', error);
    logger.error('Attempted path:', dbDir);

    if (!isDev) {
      const alternativeBase = process.env.APPDATA || process.env.LOCALAPPDATA;
      if (alternativeBase) {
        console.warn(' Trying APPDATA alternative location...');
        dbPath = path.join(
          alternativeBase,
          'leadhelper',
          'database',
          'leadhelper.db',
        );
        const altDir = path.dirname(dbPath);

        try {
          if (!fs.existsSync(altDir)) {
            fs.mkdirSync(altDir, { recursive: true });
          }
          logger.info('Using APPDATA alternative path:', dbPath);

          logger.info('Database path resolved:', logger.colors.cyan(dbPath));
          logger.info(
            'Environment:',
            logger.colors.yellow('production (alternative)'),
          );
          return dbPath;
        } catch (altError) {
          logger.error('Alternative path also failed:', altError);
        }
      }
    }

    if (isDev) {
      logger.warning(' Trying local project folder...');

      dbPath = path.join(process.cwd(), 'database', 'leadhelper.db');
      const altDir = path.dirname(dbPath);

      try {
        if (!fs.existsSync(altDir)) {
          fs.mkdirSync(altDir, { recursive: true });
        }
        logger.info('Using local project path:', dbPath);
      } catch (altError) {
        const errorMsg =
          `Cannot create database directory.\n` +
          `Tried: ${dbDir}\n` +
          `Alternative: ${altDir}\n` +
          `Original error: ${error}\n` +
          `Alternative error: ${altError}`;

        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      const errorMsg =
        `Cannot create database directory in production.\n` +
        `Attempted path: ${dbDir}\n` +
        `Error: ${error}\n` +
        `Please check user permissions for AppData folder.`;

      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  logger.info('Database path resolved:', logger.colors.cyan(dbPath));
  logger.info(
    'Environment:',
    logger.colors.yellow(isDev ? 'development' : 'production'),
  );

  return dbPath;
}

export function getDatabaseDirectoryInfo(dbPath: string): {
  path: string;
  directory: string;
  exists: boolean;
  writable: boolean;
  readable: boolean;
  size?: number;
  userDataPath: string;
  appDataPath: string | undefined;
  isDevelopment: boolean;
} {
  const dbDir = path.dirname(dbPath);
  const exists = fs.existsSync(dbPath);

  let writable = false;
  let readable = false;
  let size: number | undefined;

  try {
    fs.accessSync(dbDir, fs.constants.W_OK);
    writable = true;
  } catch {
    /* empty */
  }

  try {
    fs.accessSync(dbDir, fs.constants.R_OK);
    readable = true;
  } catch {
    /* empty */
  }

  if (exists) {
    try {
      const stats = fs.statSync(dbPath);
      size = stats.size;
    } catch (error) {
      logger.warning('Could not read database file stats:', error);
    }
  }

  return {
    path: dbPath,
    directory: dbDir,
    exists,
    writable,
    readable,
    size,
    userDataPath: app.getPath('userData'),
    appDataPath: process.env.APPDATA || process.env.LOCALAPPDATA,
    isDevelopment: isDevelopmentMode(),
  };
}

export function validateDatabasePath(dbPath: string): boolean {
  try {
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      logger.error('Database directory does not exist:', dbDir);
      return false;
    }

    fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);

    logger.info('Database path is valid:', dbPath);
    return true;
  } catch (error) {
    logger.error('Invalid database path:', dbPath, error);
    return false;
  }
}

export function getSystemPathsInfo(): {
  cwd: string;
  execPath: string;
  appPath: string;
  userData: string;
  appData: string | undefined;
  localAppData: string | undefined;
  temp: string;
  home: string;
  isDevelopment: boolean;
} {
  return {
    cwd: process.cwd(),
    execPath: process.execPath,
    appPath: app.getAppPath(),
    userData: app.getPath('userData'),
    appData: process.env.APPDATA,
    localAppData: process.env.LOCALAPPDATA,
    temp: app.getPath('temp'),
    home: app.getPath('home'),
    isDevelopment: isDevelopmentMode(),
  };
}
