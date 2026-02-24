import * as fs from 'fs';
import * as path from 'path';
let electronApp: { getPath: (name: string) => string } | null = null;
function getElectronApp(): { getPath: (name: string) => string } | null {
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
export interface LogFileConfig {
  logDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
  filePrefix?: string;
  enabled?: boolean;
}
export interface LogEntry {
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  args?: unknown;
}
class LogFileService {
  private logDir: string = '';
  private maxFileSize: number = 5 * 1024 * 1024;
  private maxFiles: number = 7;
  private filePrefix: string = 'app';
  private enabled: boolean = true;
  private currentFilePath: string = '';
  private writeStream: fs.WriteStream | null = null;
  private initialized: boolean = false;
  private pendingWrites: string[] = [];
  private isWriting: boolean = false;
  initialize(config: LogFileConfig = {}): void {
    if (this.initialized) return;
    try {
      this.logDir = config.logDir || this.getDefaultLogDir();
      this.maxFileSize = config.maxFileSize ?? this.maxFileSize;
      this.maxFiles = config.maxFiles ?? this.maxFiles;
      this.filePrefix = config.filePrefix ?? this.filePrefix;
      this.enabled = config.enabled ?? this.enabled;
      if (!this.enabled) {
        this.initialized = true;
        return;
      }
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.openCurrentLogFile();
      this.cleanOldFiles();
      this.initialized = true;
      console.log(`[LogFileService] Initialized: ${this.logDir}`);
    } catch (error) {
      console.error('[LogFileService] Failed to initialize:', error);
      this.enabled = false;
    }
  }
  private getDefaultLogDir(): string {
    try {
      const app = getElectronApp();
      if (app) {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'logs');
      }
      return path.join(process.cwd(), 'logs');
    } catch {
      return path.join(process.cwd(), 'logs');
    }
  }
  private getLogFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return `${this.filePrefix}-${dateStr}.log`;
  }
  private openCurrentLogFile(): void {
    const fileName = this.getLogFileName();
    const filePath = path.join(this.logDir, fileName);
    if (this.currentFilePath !== filePath && this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
    this.currentFilePath = filePath;
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size >= this.maxFileSize) {
        this.rotateFile(filePath);
      }
    }
    this.writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    this.writeStream.on('error', (error) => {
      console.error('[LogFileService] Write error:', error);
    });
  }
  private rotateFile(filePath: string): void {
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    let i = 1;
    while (fs.existsSync(`${base}.${i}${ext}`)) {
      i++;
    }
    fs.renameSync(filePath, `${base}.${i}${ext}`);
  }
  private cleanOldFiles(): void {
    try {
      const files = fs
        .readdirSync(this.logDir)
        .filter((f) => f.startsWith(this.filePrefix) && f.endsWith('.log'))
        .map((f) => ({
          name: f,
          path: path.join(this.logDir, f),
          mtime: fs.statSync(path.join(this.logDir, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      const filesToDelete = files.slice(this.maxFiles);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`[LogFileService] Deleted old log: ${file.name}`);
      }
    } catch (error) {
      console.error('[LogFileService] Error cleaning old files:', error);
    }
  }
  write(entry: LogEntry): void {
    if (!this.enabled) return;
    if (!this.initialized) {
      this.initialize();
    }
    const line = JSON.stringify(entry) + '\n';
    this.pendingWrites.push(line);
    this.processWriteQueue();
  }
  private processWriteQueue(): void {
    if (this.isWriting || this.pendingWrites.length === 0) return;
    this.isWriting = true;
    const expectedFileName = this.getLogFileName();
    const expectedFilePath = path.join(this.logDir, expectedFileName);
    if (this.currentFilePath !== expectedFilePath) {
      this.openCurrentLogFile();
    }
    const toWrite = this.pendingWrites.splice(0, this.pendingWrites.length);
    if (this.writeStream) {
      for (const line of toWrite) {
        this.writeStream.write(line);
      }
    }
    this.isWriting = false;
    if (this.pendingWrites.length > 0) {
      setImmediate(() => this.processWriteQueue());
    }
  }
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.once('drain', resolve);
        this.processWriteQueue();
      } else {
        resolve();
      }
    });
  }
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
    this.initialized = false;
  }
  getLogDirectory(): string {
    return this.logDir;
  }
  getLogFiles(): string[] {
    if (!this.logDir || !fs.existsSync(this.logDir)) {
      return [];
    }
    return fs
      .readdirSync(this.logDir)
      .filter((f) => f.startsWith(this.filePrefix) && f.endsWith('.log'))
      .sort()
      .reverse();
  }
}
export const logFileService = new LogFileService();
