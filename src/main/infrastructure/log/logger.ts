import { logFileService, LogEntry } from './log-file-service';

export enum LogLevel {
  INFO = 'INFO',
  OK = 'OK',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  START = 'START',
  CONFIG = 'CONFIG',
}

export interface SyncLogData {
  entityType: string;

  direction: 'FROM_API' | 'TO_API';

  count: number;

  result: 'SUCCESS' | 'ERROR' | 'PARTIAL';

  durationMs?: number;

  errorMessage?: string;

  details?: Record<string, unknown>;
}

export interface ApiErrorLogData {
  endpoint: string;

  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  httpStatus: number;

  errorMessage: string;

  responseTimeMs?: number;

  requestBody?: Record<string, unknown>;

  responseBody?: Record<string, unknown>;
}

export interface ConnectionLogData {
  turnstileId: number;

  turnstileIdentifier?: string;

  manufacturer?: string;

  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

  ip?: string;

  port?: number;

  errorMessage?: string;

  reconnectAttempts?: number;
}

export interface AccessLogData {
  workerId?: number;

  workerName?: string;

  cardNumber?: string;

  turnstileId: number;

  turnstileIdentifier?: string;

  action:
    | 'GRANTED'
    | 'DENIED'
    | 'SPIN'
    | 'DESISTANCE'
    | 'MASTER_RELEASE'
    | 'REACTIVATION';

  direction?: 'ENTRADA' | 'SAIDA';

  reason?: string;

  authMethod?: 'card' | 'facial' | 'fingerprint' | 'master';
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.OK]: 2,
  [LogLevel.INFO]: 3,
  [LogLevel.START]: 4,
  [LogLevel.CONFIG]: 5,
  [LogLevel.DEBUG]: 6,
};

export const ANSI_COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
} as const;

export const LEVEL_CONFIG: Record<
  LogLevel,
  { color: string; label: string; width: number }
> = {
  [LogLevel.INFO]: { color: ANSI_COLORS.brightBlue, label: 'INFO', width: 5 },
  [LogLevel.OK]: { color: ANSI_COLORS.brightGreen, label: 'OK', width: 5 },
  [LogLevel.WARN]: { color: ANSI_COLORS.brightYellow, label: 'WARN', width: 5 },
  [LogLevel.ERROR]: { color: ANSI_COLORS.brightRed, label: 'ERROR', width: 5 },
  [LogLevel.DEBUG]: { color: ANSI_COLORS.magenta, label: 'DEBUG', width: 5 },
  [LogLevel.START]: { color: ANSI_COLORS.cyan, label: 'START', width: 5 },
  [LogLevel.CONFIG]: { color: ANSI_COLORS.gray, label: 'CONFIG', width: 6 },
};

export const BROWSER_COLORS: Record<LogLevel, string> = {
  [LogLevel.INFO]: 'color: #60a5fa; font-weight: bold',
  [LogLevel.OK]: 'color: #34d399; font-weight: bold',
  [LogLevel.WARN]: 'color: #fbbf24; font-weight: bold',
  [LogLevel.ERROR]: 'color: #f87171; font-weight: bold',
  [LogLevel.DEBUG]: 'color: #c084fc; font-weight: bold',
  [LogLevel.START]: 'color: #22d3ee; font-weight: bold',
  [LogLevel.CONFIG]: 'color: #9ca3af; font-weight: bold',
};

export interface LoggerConfig {
  consoleLevel?: LogLevel;

  fileLevel?: LogLevel;

  writeToFile?: boolean;
}

let globalConfig: LoggerConfig = {
  consoleLevel: LogLevel.DEBUG,
  fileLevel: LogLevel.INFO,
  writeToFile: false,
};

export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };

  if (process.env.NODE_ENV === 'production') {
    globalConfig.writeToFile = config.writeToFile ?? true;
    globalConfig.consoleLevel = config.consoleLevel ?? LogLevel.WARN;
    globalConfig.fileLevel = config.fileLevel ?? LogLevel.INFO;
  }
}

export function formatTimestamp(): string {
  const date = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const min = pad(date.getMinutes());
  const sec = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);

  const offsetMin = date.getTimezoneOffset();
  const offsetHour = Math.floor(Math.abs(offsetMin) / 60);
  const offsetRestMin = Math.abs(offsetMin) % 60;
  const sign = offsetMin > 0 ? '-' : '+';
  const offset = `${sign}${pad(offsetHour)}:${pad(offsetRestMin)}`;

  return `${year}-${month}-${day}T${hour}:${min}:${sec}.${ms}${offset}`;
}

function formatPrefix(level: LogLevel, useColors: boolean): string {
  const config = LEVEL_CONFIG[level];
  const paddedLabel = config.label.padEnd(config.width);

  if (useColors) {
    return `${ANSI_COLORS.bold}${config.color}${paddedLabel}${ANSI_COLORS.reset}`;
  }
  return paddedLabel;
}

function formatTimestampColored(useColors: boolean): string {
  const ts = formatTimestamp();
  if (useColors) {
    return `${ANSI_COLORS.gray}[${ts}]${ANSI_COLORS.reset}`;
  }
  return `[${ts}]`;
}

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[minLevel];
}

function serializeArgs(args: unknown[]): unknown {
  if (args.length === 0) return undefined;
  if (args.length === 1) {
    const arg = args[0];
    if (arg instanceof Error) {
      return { error: arg.message, stack: arg.stack };
    }
    return arg;
  }
  return args.map((arg) => {
    if (arg instanceof Error) {
      return { error: arg.message, stack: arg.stack };
    }
    return arg;
  });
}

class Logger {
  private isRenderer: boolean;
  private context: string;
  private fileServiceInitialized: boolean = false;

  constructor(context?: string) {
    this.context = context || '';
    this.isRenderer =
      typeof window !== 'undefined' && typeof window.process === 'undefined';

    if (!this.isRenderer && !context && globalConfig.writeToFile) {
      this.initFileService();
    }

    if (!context) {
      if (this.isRenderer) {
        console.log(
          '%c[LOGGER] Inicializado no RENDERER',
          'color: #22d3ee; font-weight: bold',
        );
      } else {
        console.log(
          `${ANSI_COLORS.bold}${ANSI_COLORS.cyan}[LOGGER] Inicializado no MAIN PROCESS${ANSI_COLORS.reset}`,
        );
      }
    }
  }

  private initFileService(): void {
    if (this.fileServiceInitialized) return;

    try {
      logFileService.initialize({
        maxFileSize: 5 * 1024 * 1024,
        maxFiles: 7,
        filePrefix: 'app',
      });
      this.fileServiceInitialized = true;
    } catch (error) {
      console.error('[Logger] Failed to initialize file service:', error);
    }
  }

  private shouldLogToConsole(level: LogLevel): boolean {
    const minLevel = globalConfig.consoleLevel ?? LogLevel.DEBUG;
    return shouldLog(level, minLevel);
  }

  private shouldLogToFile(level: LogLevel): boolean {
    if (!globalConfig.writeToFile) return false;
    const minLevel = globalConfig.fileLevel ?? LogLevel.INFO;
    return shouldLog(level, minLevel);
  }

  private formatMessage(message: string): string {
    if (this.context) {
      return `[${this.context}] ${message}`;
    }
    return message;
  }

  private writeToFile(level: LogLevel, message: string, args: unknown[]): void {
    if (!this.shouldLogToFile(level) || this.isRenderer) return;

    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      context: this.context || undefined,
      message,
      args: serializeArgs(args),
    };

    logFileService.write(entry);
  }

  private print(level: LogLevel, message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage(message);

    this.writeToFile(level, message, args);

    if (!this.shouldLogToConsole(level)) return;

    if (this.isRenderer) {
      this.printBrowser(level, formattedMessage, ...args);
    } else {
      this.printTerminal(level, formattedMessage, ...args);
    }
  }

  private printTerminal(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): void {
    const prefix = formatPrefix(level, true);
    const timestamp = formatTimestampColored(true);
    console.log(`${prefix} ${timestamp} ${message}`, ...args);
  }

  private printBrowser(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): void {
    const config = LEVEL_CONFIG[level];
    const paddedLabel = config.label.padEnd(config.width);
    const timestamp = formatTimestamp();

    console.log(
      `%c${paddedLabel}%c [${timestamp}] ${message}`,
      BROWSER_COLORS[level],
      'color: #6b7280',
      ...args,
    );
  }

  info(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.INFO, msg, ...args);
  }

  success(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.OK, msg, ...args);
  }

  warning(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.WARN, msg, ...args);
  }

  error(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.ERROR, msg, ...args);
  }

  debug(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.DEBUG, msg, ...args);
  }

  start(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.START, msg, ...args);
  }

  config(msg: string, ...args: unknown[]): void {
    this.print(LogLevel.CONFIG, msg, ...args);
  }

  separator(char = '─', length = 60): void {
    const line = char.repeat(length);
    if (this.isRenderer) {
      console.log('%c' + line, 'color: #6b7280');
    } else {
      console.log(`${ANSI_COLORS.gray}${line}${ANSI_COLORS.reset}`);
    }
  }

  header(message: string): void {
    this.separator('═');
    if (this.isRenderer) {
      console.log(
        `%c  ${message}`,
        'color: #22d3ee; font-weight: bold; font-size: 14px',
      );
    } else {
      console.log(
        `${ANSI_COLORS.bold}${ANSI_COLORS.cyan}  ${message}${ANSI_COLORS.reset}`,
      );
    }
    this.separator('═');
  }

  table(data: Record<string, unknown>): void {
    console.table(data);
  }

  colors = {
    blue: (t: string): string => `${ANSI_COLORS.blue}${t}${ANSI_COLORS.reset}`,
    green: (t: string): string =>
      `${ANSI_COLORS.green}${t}${ANSI_COLORS.reset}`,
    yellow: (t: string): string =>
      `${ANSI_COLORS.yellow}${t}${ANSI_COLORS.reset}`,
    red: (t: string): string => `${ANSI_COLORS.red}${t}${ANSI_COLORS.reset}`,
    magenta: (t: string): string =>
      `${ANSI_COLORS.magenta}${t}${ANSI_COLORS.reset}`,
    cyan: (t: string): string => `${ANSI_COLORS.cyan}${t}${ANSI_COLORS.reset}`,
    gray: (t: string): string => `${ANSI_COLORS.gray}${t}${ANSI_COLORS.reset}`,
    white: (t: string): string =>
      `${ANSI_COLORS.white}${t}${ANSI_COLORS.reset}`,
    bold: (t: string): string => `${ANSI_COLORS.bold}${t}${ANSI_COLORS.reset}`,
  };

  logSync(data: SyncLogData): void {
    const directionLabel = data.direction === 'FROM_API' ? '← API' : '→ API';
    const resultEmoji =
      data.result === 'SUCCESS' ? '✓' : data.result === 'ERROR' ? '✗' : '⚠';

    const parts: string[] = [
      `[SYNC]`,
      `${data.entityType}`,
      directionLabel,
      `| ${data.count} itens`,
      `| ${resultEmoji} ${data.result}`,
    ];

    if (data.durationMs !== undefined) {
      parts.push(`| ${data.durationMs}ms`);
    }

    const message = parts.join(' ');

    if (data.result === 'SUCCESS') {
      this.print(LogLevel.OK, message, data.details);
    } else if (data.result === 'ERROR') {
      this.print(LogLevel.ERROR, message, data.errorMessage, data.details);
    } else {
      this.print(LogLevel.WARN, message, data.details);
    }

    this.writeToFile(
      data.result === 'ERROR' ? LogLevel.ERROR : LogLevel.INFO,
      message,
      [{ type: 'sync', ...data }],
    );
  }

  logApiError(data: ApiErrorLogData): void {
    const parts: string[] = [
      `[API ERROR]`,
      `${data.method} ${data.endpoint}`,
      `| HTTP ${data.httpStatus}`,
      `| ${data.errorMessage}`,
    ];

    if (data.responseTimeMs !== undefined) {
      parts.push(`| ${data.responseTimeMs}ms`);
    }

    const message = parts.join(' ');

    this.print(LogLevel.ERROR, message, {
      endpoint: data.endpoint,
      method: data.method,
      httpStatus: data.httpStatus,
      responseBody: data.responseBody,
    });

    this.writeToFile(LogLevel.ERROR, message, [{ type: 'api_error', ...data }]);
  }

  logConnection(data: ConnectionLogData): void {
    const statusEmoji = {
      CONNECTED: '🟢',
      DISCONNECTED: '🔴',
      RECONNECTING: '🟡',
      ERROR: '❌',
    }[data.status];

    const turnstileLabel =
      data.turnstileIdentifier || `Catraca ${data.turnstileId}`;

    const parts: string[] = [
      `[CONNECTION]`,
      `${statusEmoji} ${turnstileLabel}`,
      `(ID: ${data.turnstileId})`,
      `| ${data.status}`,
    ];

    if (data.manufacturer) {
      parts.push(`| ${data.manufacturer}`);
    }

    if (data.ip) {
      const address = data.port ? `${data.ip}:${data.port}` : data.ip;
      parts.push(`| ${address}`);
    }

    if (data.reconnectAttempts !== undefined && data.reconnectAttempts > 0) {
      parts.push(`| Tentativa ${data.reconnectAttempts}`);
    }

    const message = parts.join(' ');

    switch (data.status) {
      case 'CONNECTED':
        this.print(LogLevel.OK, message);
        break;
      case 'DISCONNECTED':
        this.print(LogLevel.WARN, message);
        break;
      case 'RECONNECTING':
        this.print(LogLevel.INFO, message);
        break;
      case 'ERROR':
        this.print(LogLevel.ERROR, message, data.errorMessage);
        break;
    }

    this.writeToFile(
      data.status === 'ERROR' ? LogLevel.ERROR : LogLevel.INFO,
      message,
      [{ type: 'connection', ...data }],
    );
  }

  logAccess(data: AccessLogData): void {
    const actionEmoji = {
      GRANTED: '✅',
      DENIED: '🚫',
      SPIN: '🔄',
      DESISTANCE: '↩️',
      MASTER_RELEASE: '🔑',
      REACTIVATION: '♻️',
    }[data.action];

    const workerLabel = data.workerName
      ? `${data.workerName} (ID: ${data.workerId})`
      : data.cardNumber
        ? `Cartão ${data.cardNumber}`
        : 'Desconhecido';

    const turnstileLabel =
      data.turnstileIdentifier || `Catraca ${data.turnstileId}`;

    const parts: string[] = [
      `[ACCESS]`,
      `${actionEmoji} ${data.action}`,
      `| ${workerLabel}`,
      `| ${turnstileLabel}`,
    ];

    if (data.direction) {
      parts.push(`| ${data.direction}`);
    }

    if (data.authMethod) {
      parts.push(`| via ${data.authMethod}`);
    }

    if (data.reason) {
      parts.push(`| Motivo: ${data.reason}`);
    }

    const message = parts.join(' ');

    switch (data.action) {
      case 'GRANTED':
      case 'SPIN':
      case 'REACTIVATION':
        this.print(LogLevel.OK, message);
        break;
      case 'DENIED':
        this.print(LogLevel.WARN, message);
        break;
      case 'DESISTANCE':
        this.print(LogLevel.INFO, message);
        break;
      case 'MASTER_RELEASE':
        this.print(LogLevel.INFO, message);
        break;
    }

    this.writeToFile(LogLevel.INFO, message, [{ type: 'access', ...data }]);
  }

  withContext(context: string): Logger {
    return new Logger(context);
  }

  getLogDirectory(): string {
    return logFileService.getLogDirectory();
  }

  getLogFiles(): string[] {
    return logFileService.getLogFiles();
  }
}

export const logger = new Logger();
