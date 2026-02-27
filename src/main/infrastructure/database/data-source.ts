import { DataSource, DataSourceOptions } from 'typeorm';
import path from 'path';
import fs from 'fs';
import { logger } from '@main/infrastructure/log/logger';
import { runMigrations } from './migration-runner';

// Team Management System entities
import { TeamMemberEntity } from '@main/application/entities/team-member.entity';
import { TaskEntity } from '@main/application/entities/task.entity';
import { TeamMemberAllocationEntity } from '@main/application/entities/team-member-allocation.entity';
import { AzureDevOpsConfigEntity } from '@main/application/entities/azure-devops-config.entity';
import { UserEntity } from '@main/application/entities/user.entity';
import { PositionEntity } from '@main/application/entities/position.entity';
import { TeamEntity } from '@main/application/entities/team.entity';
import { SprintEntity } from '@main/application/entities/sprint.entity';
import { TaskCommentEntity } from '@main/application/entities/task-comment.entity';

const isDev = process.env.NODE_ENV === 'development';

let dbPath: string | null = null;

let dataSourceInstance: DataSource | null = null;

export const setDatabasePath = (path: string): void => {
  dbPath = path;
  process.env.DB_PATH = path;
  logger.info('Database path set:', logger.colors.cyan(path));
};

export const getDatabasePath = (): string => {
  if (!dbPath && !process.env.DB_PATH) {
    throw new Error(
      'Database path not configured. Call setDatabasePath() before using the database.',
    );
  }
  return dbPath || process.env.DB_PATH!;
};

function createDataSource(): DataSource {
  const currentDbPath = getDatabasePath();

  logger.info('Creating DataSource with configuration:', {
    path: logger.colors.cyan(currentDbPath),
    environment: logger.colors.yellow(isDev ? 'development' : 'production'),
    synchronize: false,
    logging: isDev,
  });

  const dataSourceOptions: DataSourceOptions = {
    type: 'better-sqlite3',
    database: currentDbPath,

    synchronize: false,
    logging: isDev ? ['query', 'error'] : false,
    entities: [
      TeamMemberEntity,
      TaskEntity,
      TeamMemberAllocationEntity,
      AzureDevOpsConfigEntity,
      UserEntity,
      PositionEntity,
      TeamEntity,
      SprintEntity,
      TaskCommentEntity,
    ],
    migrations: [],
    subscribers: [],

    extra: {
      busyTimeout: 10000,
      journal: 'wal',
      timeout: 10000,
      synchronous: 'NORMAL',
      cacheSize: -64000,
      pageSize: 4096,
      locking: true,
      readOnly: false,
      fileMustExist: false,
    },
  };

  return new DataSource(dataSourceOptions);
}

export const getDataSource = (): DataSource => {
  if (!dataSourceInstance) {
    throw new Error(
      'DataSource não foi criado. Certifique-se de que initializeDatabase() foi chamado antes de usar o banco de dados.',
    );
  }

  if (!dataSourceInstance.isInitialized) {
    throw new Error(
      'DataSource existe mas não está inicializado. Aguarde a inicialização completa.',
    );
  }

  if (!dataSourceInstance.manager) {
    throw new Error(
      'DataSource está inicializado mas o manager não está disponível.',
    );
  }

  return dataSourceInstance;
};

export const AppDataSource = {
  get isInitialized() {
    return dataSourceInstance?.isInitialized || false;
  },
  get manager() {
    if (!dataSourceInstance) {
      throw new Error(
        'DataSource not created. Call initializeDatabase() first.',
      );
    }
    return dataSourceInstance.manager;
  },
  getRepository: <T>(entity: new () => T) => {
    if (!dataSourceInstance) {
      throw new Error(
        'DataSource not created. Call initializeDatabase() first.',
      );
    }
    return dataSourceInstance.getRepository(entity);
  },
  initialize: async () => {
    return initializeDatabase();
  },
  destroy: async () => {
    return closeDatabase();
  },
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!dataSourceInstance) {
      dataSourceInstance = createDataSource();
    }

    if (dataSourceInstance.isInitialized) {
      logger.info('Database already initialized');
      return;
    }

    const currentDbPath = getDatabasePath();
    logger.info('Initializing database...');
    logger.info('Database location:', logger.colors.cyan(currentDbPath));

    const dbDir = path.dirname(currentDbPath);
    if (!fs.existsSync(dbDir)) {
      logger.error('Database directory does not exist:', dbDir);
      throw new Error(`Database directory not found: ${dbDir}`);
    }

    logger.info('Running database migrations...');
    await runMigrations(currentDbPath);
    logger.success('Migrations completed');

    await dataSourceInstance.initialize();

    logger.success('Database initialized successfully');
    logger.info('Database location:', logger.colors.cyan(currentDbPath));

    if (fs.existsSync(currentDbPath)) {
      const stats = fs.statSync(currentDbPath);
      logger.info(
        'Database file size:',
        logger.colors.cyan(`${stats.size} bytes`),
      );
    }
  } catch (error) {
    logger.error('Error initializing database:', error);

    const currentDbPath = getDatabasePath();
    logger.error('Database path:', currentDbPath);

    const dbDir = path.dirname(currentDbPath);
    logger.error('Database directory exists:', fs.existsSync(dbDir));

    if (fs.existsSync(dbDir)) {
      try {
        const stats = fs.statSync(dbDir);
        logger.error('Directory permissions:', {
          readable: !!(stats.mode & fs.constants.S_IRUSR),
          writable: !!(stats.mode & fs.constants.S_IWUSR),
          executable: !!(stats.mode & fs.constants.S_IXUSR),
        });
      } catch (e) {
        logger.error('Cannot read directory stats:', e);
      }
    }

    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (!dataSourceInstance) {
      logger.info('Database not created');
      return;
    }

    if (!dataSourceInstance.isInitialized) {
      logger.info('Database already closed');
      return;
    }

    logger.info('Closing database connection...');

    // Force WAL checkpoint before closing to ensure all data is persisted
    try {
      await dataSourceInstance.query('PRAGMA wal_checkpoint(TRUNCATE)');
      logger.info('WAL checkpoint completed');
    } catch (checkpointError) {
      logger.warning('WAL checkpoint failed (non-critical):', checkpointError);
    }

    await dataSourceInstance.destroy();
    logger.success('Database connection closed');

    dataSourceInstance = null;
  } catch (error) {
    logger.error('Error closing database:', error);
    throw error;
  }
};

export const isDatabaseInitialized = (): boolean => {
  return dataSourceInstance?.isInitialized || false;
};

export const getDatabaseStats = (): {
  path: string;
  initialized: boolean;
  size?: number;
  exists: boolean;
} => {
  const currentDbPath = getDatabasePath();
  const exists = fs.existsSync(currentDbPath);
  let size: number | undefined;

  if (exists) {
    try {
      const stats = fs.statSync(currentDbPath);
      size = stats.size;
    } catch (error) {
      logger.warning('Could not read database file stats:', error);
    }
  }

  return {
    path: currentDbPath,
    initialized: isDatabaseInitialized(),
    size,
    exists,
  };
};
