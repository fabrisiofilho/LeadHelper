import type BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from '@main/infrastructure/log/logger';

function getNativeBinding(): string | undefined {
  const isDev =
    process.env.NODE_ENV === 'development' ||
    !process.resourcesPath?.includes('app.asar');
  if (isDev) {
    return undefined;
  }

  const nativePath = path.join(
    process.resourcesPath!,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node',
  );

  return nativePath;
}

const nativeBinding = getNativeBinding();

type DatabaseConstructor = typeof BetterSqlite3;

const Database: DatabaseConstructor = nativeBinding
  ? (() => {
      const mod = require('better-sqlite3');
      return mod.default || mod;
    })()
  : require('better-sqlite3');

function createDatabase(dbPath: string): BetterSqlite3.Database {
  const options: BetterSqlite3.Options = {};
  if (nativeBinding) {
    options.nativeBinding = nativeBinding;
  }
  return new Database(dbPath, options);
}

let electronApp: {
  getAppPath: () => string;
  getPath: (name: string) => string;
} | null = null;

function getElectronApp(): {
  getAppPath: () => string;
  getPath: (name: string) => string;
} | null {
  if (electronApp !== null) return electronApp;

  try {
    const moduleName = 'electron';

    const electron = require(moduleName);
    electronApp = electron.app || null;
    return electronApp;
  } catch {
    electronApp = null;
    return null;
  }
}

interface Migration {
  id: number;
  name: string;
  applied_at: string;
}

interface MigrationFile {
  name: string;
  path: string;
  version: number;
}

export class MigrationRunner {
  private db: BetterSqlite3.Database;
  private dbPath: string;
  private migrationsPath: string;
  private backupPath: string | null = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = createDatabase(dbPath);
    this.migrationsPath = this.resolveMigrationsPath();

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
  }

  private resolveMigrationsPath(): string {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return path.join(
        process.cwd(),
        'src/main/infrastructure/database/migrations',
      );
    }

    const app = getElectronApp();
    if (!app) {
      const defaultPath = path.join(process.cwd(), 'out/main/migrations');
      logger.info(
        'Worker thread - using default migrations path:',
        defaultPath,
      );
      return defaultPath;
    }

    const possiblePaths = [
      path.join(app.getAppPath(), 'out/main/migrations'),
      path.join(
        app.getAppPath(),
        '..',
        'app.asar.unpacked',
        'out/main/migrations',
      ),
      path.join(path.dirname(app.getPath('exe')), 'resources', 'migrations'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        logger.info('Migrations path found:', p);
        return p;
      }
    }

    const defaultPath = path.join(app.getAppPath(), 'out/main/migrations');
    logger.warning('Using default migrations path:', defaultPath);
    return defaultPath;
  }

  private createBackup(): string | null {
    if (!fs.existsSync(this.dbPath)) {
      return null;
    }

    const timestamp = Date.now();
    const backupPath = `${this.dbPath}.backup_${timestamp}`;

    try {
      this.db.close();
      fs.copyFileSync(this.dbPath, backupPath);

      const walPath = `${this.dbPath}-wal`;
      const shmPath = `${this.dbPath}-shm`;

      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, `${backupPath}-wal`);
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, `${backupPath}-shm`);
      }

      this.db = createDatabase(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('synchronous = NORMAL');

      logger.info('Database backup created:', backupPath);
      this.backupPath = backupPath;
      return backupPath;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      try {
        this.db = createDatabase(this.dbPath);
      } catch {}
      throw new Error(`Failed to create database backup: ${error}`);
    }
  }

  private restoreBackup(): void {
    if (!this.backupPath || !fs.existsSync(this.backupPath)) {
      logger.warning('No backup to restore');
      return;
    }

    try {
      try {
        this.db.close();
      } catch {}

      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
      }

      const walPath = `${this.dbPath}-wal`;
      const shmPath = `${this.dbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

      fs.copyFileSync(this.backupPath, this.dbPath);

      const backupWalPath = `${this.backupPath}-wal`;
      const backupShmPath = `${this.backupPath}-shm`;
      if (fs.existsSync(backupWalPath)) {
        fs.copyFileSync(backupWalPath, walPath);
      }
      if (fs.existsSync(backupShmPath)) {
        fs.copyFileSync(backupShmPath, shmPath);
      }

      logger.success('Database restored from backup');

      this.db = createDatabase(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
    } catch (error) {
      logger.error('Failed to restore backup:', error);
      throw new Error(`Failed to restore database backup: ${error}`);
    }
  }

  private removeBackup(): void {
    if (!this.backupPath) return;

    try {
      if (fs.existsSync(this.backupPath)) {
        fs.unlinkSync(this.backupPath);
      }

      const backupWalPath = `${this.backupPath}-wal`;
      const backupShmPath = `${this.backupPath}-shm`;
      if (fs.existsSync(backupWalPath)) fs.unlinkSync(backupWalPath);
      if (fs.existsSync(backupShmPath)) fs.unlinkSync(backupShmPath);

      logger.info('Backup removed after successful migration');
      this.backupPath = null;
    } catch (error) {
      logger.warning('Failed to remove backup (non-critical):', error);
    }
  }

  private isLegacyDatabase(): boolean {
    const migrationsTableExists = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'",
      )
      .get();

    // If migrations table exists, it's not a legacy database
    if (migrationsTableExists) {
      return false;
    }

    // Check if there are any tables that would indicate a legacy TypeORM database
    const existingTables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[];

    // Only consider it legacy if there are tables AND no migrations table
    // AND the tables match TypeORM's synchronize pattern (has typeorm_metadata or similar)
    const tableNames = existingTables.map((t) => t.name);
    const hasTypeOrmMetadata = tableNames.includes('typeorm_metadata');

    return hasTypeOrmMetadata && existingTables.length > 0;
  }

  private isInconsistentDatabase(): boolean {
    const migrationsTableExists = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'",
      )
      .get();

    if (!migrationsTableExists) {
      return false;
    }

    // Check if migrations table has the expected migration applied
    const appliedMigrations = this.db
      .prepare('SELECT name FROM migrations')
      .all() as { name: string }[];

    // If we have migrations applied, the database is consistent
    if (appliedMigrations.length > 0) {
      return false;
    }

    // Only inconsistent if migrations table exists but is empty AND there are other tables
    const existingTables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'",
      )
      .all() as { name: string }[];

    return existingTables.length > 0;
  }

  /**
   * Detects databases that have old individual migrations (002-008) applied.
   * These have been consolidated into 001_leadhelper_schema.
   * Returns the list of legacy migration names found.
   */
  private getObsoleteMigrations(): string[] {
    const obsoleteNames = [
      '002_task_status_config',
      '003_default_kanban_statuses',
      '004_task_comments',
      '005_task_assignee',
      '006_task_type',
      '007_azure_devops_enrichment',
      '008_team_azure_area_path',
    ];

    try {
      const migrationsTableExists = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'",
        )
        .get();

      if (!migrationsTableExists) {
        return [];
      }

      const applied = this.db.prepare('SELECT name FROM migrations').all() as {
        name: string;
      }[];

      const appliedNames = new Set(applied.map((r) => r.name));
      return obsoleteNames.filter((name) => appliedNames.has(name));
    } catch {
      return [];
    }
  }

  /**
   * Handles transition from old individual migrations (002-008) to the
   * consolidated 001_leadhelper_schema. Removes obsolete migration records
   * so the runner only tracks the consolidated schema migration.
   */
  private cleanupObsoleteMigrationRecords(): void {
    const obsolete = this.getObsoleteMigrations();
    if (obsolete.length === 0) {
      return;
    }

    logger.info(
      `Found ${obsolete.length} obsolete migration records to clean up: ${obsolete.join(', ')}`,
    );

    for (const name of obsolete) {
      this.db.prepare('DELETE FROM migrations WHERE name = ?').run(name);
      logger.info(`Removed obsolete migration record: ${name}`);
    }

    logger.success('Obsolete migration records cleaned up');
  }

  private checkForUserData(): boolean {
    try {
      // Check if users table exists and has data
      const usersTableExists = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
        )
        .get();

      if (!usersTableExists) {
        return false;
      }

      const userCount = this.db
        .prepare('SELECT COUNT(*) as count FROM users')
        .get() as { count: number };

      if (userCount && userCount.count > 0) {
        logger.info(
          `Found ${userCount.count} users in database - protecting data`,
        );
        return true;
      }

      return false;
    } catch (error) {
      // If we can't check, assume there might be data and don't cleanup
      logger.warning(
        'Could not check for user data, assuming data exists:',
        error,
      );
      return true;
    }
  }

  private dropAllTables(): void {
    const existingTables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[];

    const tableNames = existingTables.map((t) => t.name);

    if (tableNames.length === 0) {
      return;
    }

    this.db.pragma('foreign_keys = OFF');

    try {
      for (const tableName of tableNames) {
        logger.info(`Dropping table: ${tableName}`);
        this.db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
      }
    } finally {
      this.db.pragma('foreign_keys = ON');
    }
  }

  private createMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private getAppliedMigrations(): Set<string> {
    const rows = this.db
      .prepare('SELECT name FROM migrations')
      .all() as Migration[];
    return new Set(rows.map((r) => r.name));
  }

  private getMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsPath)) {
      logger.warning('Migrations directory not found:', this.migrationsPath);
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsPath)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    return files
      .map((f) => {
        const match = f.match(/^(\d+)_/);
        const version = match ? parseInt(match[1], 10) : 0;

        return {
          name: f.replace('.sql', ''),
          path: path.join(this.migrationsPath, f),
          version,
        };
      })
      .sort((a, b) => a.version - b.version);
  }

  private executeMigration(migration: MigrationFile): void {
    const sql = fs.readFileSync(migration.path, 'utf-8');

    logger.info(`Executing migration: ${migration.name}`);

    const statements = this.splitSqlStatements(sql);

    const pragmaStatements: string[] = [];
    const regularStatements: string[] = [];

    for (const statement of statements) {
      const trimmed = statement.trim().toUpperCase();
      if (trimmed.startsWith('PRAGMA')) {
        pragmaStatements.push(statement);
      } else if (trimmed) {
        regularStatements.push(statement);
      }
    }

    for (const pragma of pragmaStatements) {
      try {
        this.db.exec(pragma);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warning(`PRAGMA skipped (${errorMessage}): ${pragma}`);
      }
    }

    this.db.pragma('foreign_keys = OFF');

    for (let i = 0; i < regularStatements.length; i++) {
      const statement = regularStatements[i];
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          this.db.exec(trimmedStatement);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (
            !errorMessage.includes('already exists') &&
            !errorMessage.includes('duplicate column name')
          ) {
            const preview = trimmedStatement
              .substring(0, 100)
              .replace(/\s+/g, ' ');
            logger.error(`Failed at statement ${i + 1}: ${preview}...`);
            logger.error(`Error: ${errorMessage}`);
            throw error;
          }
        }
      }
    }

    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO migrations (name, applied_at) VALUES (?, datetime('now'))",
    );
    stmt.run(migration.name);

    this.db.pragma('foreign_keys = ON');

    logger.success(`Migration applied: ${migration.name}`);
  }

  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    let cleanSql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

    cleanSql = cleanSql
      .split('\n')
      .map((line) => {
        const commentIndex = line.indexOf('--');
        if (commentIndex === -1) return line;

        let inStr = false;
        let strChar = '';
        for (let i = 0; i < commentIndex; i++) {
          const c = line[i];
          if (!inStr && (c === "'" || c === '"')) {
            inStr = true;
            strChar = c;
          } else if (inStr && c === strChar) {
            inStr = false;
          }
        }

        if (!inStr) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n');

    for (let i = 0; i < cleanSql.length; i++) {
      const char = cleanSql[i];
      const nextChar = cleanSql[i + 1];

      if ((char === "'" || char === '"') && !inString) {
        inString = true;
        stringChar = char;
        current += char;
        continue;
      }

      if (inString && char === stringChar) {
        if (nextChar === stringChar) {
          current += char + nextChar;
          i++;
          continue;
        }
        inString = false;
        current += char;
        continue;
      }

      if (!inString && char === ';') {
        current += char;
        const trimmed = current.trim();
        if (trimmed && trimmed !== ';') {
          statements.push(trimmed);
        }
        current = '';
        continue;
      }

      current += char;
    }

    const trimmed = current.trim();
    if (trimmed && trimmed !== ';') {
      statements.push(trimmed);
    }

    return statements;
  }

  async run(): Promise<{ applied: string[]; skipped: string[] }> {
    const applied: string[] = [];
    const skipped: string[] = [];

    try {
      logger.info('Starting migration runner...');
      logger.info('Migrations path:', this.migrationsPath);
      logger.info('Database path:', this.dbPath);

      // Log existing tables for debugging
      const existingTables = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .all() as { name: string }[];
      logger.info(
        'Existing tables:',
        existingTables.map((t) => t.name).join(', ') || 'none',
      );

      const isLegacy = this.isLegacyDatabase();
      const isInconsistent = this.isInconsistentDatabase();

      logger.info('Database status:', { isLegacy, isInconsistent });

      // NEVER cleanup if we have user data - check for users table with data
      const hasUserData = this.checkForUserData();
      if (hasUserData) {
        logger.info('User data found - skipping any cleanup');
      }

      const needsCleanup = (isLegacy || isInconsistent) && !hasUserData;

      if (isLegacy && !hasUserData) {
        logger.warning(
          'Legacy database detected (created by TypeORM synchronize)',
        );
      }
      if (isInconsistent && !hasUserData) {
        logger.warning(
          'Inconsistent database detected (previous migration failed)',
        );
      }

      if (needsCleanup) {
        logger.info('Creating backup before cleanup...');
        this.createBackup();

        logger.info('Cleaning database...');
        this.dropAllTables();
        logger.success('Database cleaned');
      }

      this.createMigrationsTable();

      // Remove records of old individual migrations (002-008) that have been
      // consolidated into 001_leadhelper_schema
      this.cleanupObsoleteMigrationRecords();

      const appliedMigrations = this.getAppliedMigrations();
      logger.info(`Found ${appliedMigrations.size} applied migrations`);

      const migrationFiles = this.getMigrationFiles();
      logger.info(`Found ${migrationFiles.length} migration files`);

      for (const migration of migrationFiles) {
        if (appliedMigrations.has(migration.name)) {
          logger.info(`Skipping already applied migration: ${migration.name}`);
          skipped.push(migration.name);
          continue;
        }

        this.executeMigration(migration);
        applied.push(migration.name);
      }

      if (applied.length === 0) {
        logger.info('No new migrations to apply');
      } else {
        logger.success(`Applied ${applied.length} migrations`);
      }

      this.removeBackup();

      return { applied, skipped };
    } catch (error) {
      logger.error('Migration failed:', error);

      if (this.backupPath) {
        logger.warning('Restoring database from backup...');
        try {
          this.restoreBackup();
          logger.success('Database restored to previous state');
        } catch (restoreError) {
          logger.error('CRITICAL: Failed to restore backup:', restoreError);
          logger.error('Manual intervention may be required');
          logger.error('Backup file:', this.backupPath);
        }
      }

      throw error;
    } finally {
      this.close();
    }
  }

  getStatus(): { applied: Migration[]; pending: string[] } {
    this.createMigrationsTable();

    const appliedRows = this.db
      .prepare('SELECT id, name, applied_at FROM migrations ORDER BY id')
      .all() as Migration[];

    const appliedNames = new Set(appliedRows.map((r) => r.name));
    const migrationFiles = this.getMigrationFiles();
    const pending = migrationFiles
      .filter((m) => !appliedNames.has(m.name))
      .map((m) => m.name);

    return { applied: appliedRows, pending };
  }

  close(): void {
    if (this.db) {
      try {
        // Force WAL checkpoint before closing to persist all data
        this.db.pragma('wal_checkpoint(TRUNCATE)');
        logger.info('Migration runner: WAL checkpoint completed');
        this.db.close();
      } catch (error) {
        logger.warning('Error closing migration runner database:', error);
      }
    }
  }
}

export async function runMigrations(dbPath: string): Promise<void> {
  const runner = new MigrationRunner(dbPath);
  await runner.run();
}

export function getMigrationStatus(dbPath: string): {
  applied: Migration[];
  pending: string[];
} {
  const runner = new MigrationRunner(dbPath);
  try {
    return runner.getStatus();
  } finally {
    runner.close();
  }
}
