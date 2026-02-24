import { logger } from '@main/infrastructure/log/logger';
export interface SerializedError {
  message: string;
  code: string;
  status: number | null;
  url: string | null;
}
const SENSITIVE_PATTERNS = {
  stackTrace: /at\s+[\w.<>]+\s*\(.*:\d+:\d+\)/g,
  stackTraceSimple: /at\s+.*:\d+:\d+/g,
  windowsPath: /[A-Za-z]:\\[\w\\.-]+/g,
  unixPath: /\/(?:home|usr|var|tmp|app|src|node_modules)\/[\w/.-]+/g,
  dbConnectionString: /(?:mongodb|mysql|postgres|sqlite|redis):\/\/[^\s]+/gi,
  exceptionClassName:
    /(?:Error|Exception|TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError):\s*/g,
  nodeModulePath: /node_modules\/[\w/@.-]+/g,
  errorLineInfo: /\(.*:\d+:\d+\)/g,
  electronInternal: /electron\/js2c\/[\w.-]+/g,
};
const USER_FRIENDLY_MESSAGES = {
  connection: {
    timeout: 'Tempo limite de conexão excedido',
    refused: 'Conexão recusada pelo dispositivo',
    reset: 'Conexão foi interrompida',
    unreachable: 'Dispositivo não está acessível na rede',
    generic: 'Erro de conexão com o dispositivo',
  },
  sync: {
    serverUnavailable: 'Servidor não está disponível no momento',
    networkError: 'Erro de rede durante sincronização',
    timeout: 'Tempo limite excedido durante sincronização',
    dataConflict: 'Conflito de dados durante sincronização',
    generic: 'Erro durante sincronização de dados',
  },
  api: {
    unauthorized: 'Sessão expirada. Por favor, faça login novamente',
    forbidden: 'Você não tem permissão para esta operação',
    notFound: 'Recurso não encontrado',
    serverError: 'Erro interno do servidor',
    badRequest: 'Dados inválidos na requisição',
    generic: 'Erro ao comunicar com o servidor',
  },
  generic: 'Ocorreu um erro inesperado',
};
export interface ErrorFormatOptions {
  turnstileId?: number;
  turnstileIdentifier?: string;
  endpoint?: string;
  httpStatus?: number;
  entityType?: string;
  context?: string;
}
export interface FormattedError {
  userMessage: string;
  technicalMessage: string;
  code?: string;
  httpStatus?: number;
}
export class ErrorHandler {
  private static readonly errorLogger = logger.withContext('ErrorHandler');
  static sanitizeErrorMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return USER_FRIENDLY_MESSAGES.generic;
    }
    let sanitized = message.split('\n')[0].trim();
    sanitized = sanitized
      .replace(SENSITIVE_PATTERNS.stackTrace, '')
      .replace(SENSITIVE_PATTERNS.stackTraceSimple, '')
      .replace(SENSITIVE_PATTERNS.windowsPath, '[path]')
      .replace(SENSITIVE_PATTERNS.unixPath, '[path]')
      .replace(SENSITIVE_PATTERNS.dbConnectionString, '[connection]')
      .replace(SENSITIVE_PATTERNS.exceptionClassName, '')
      .replace(SENSITIVE_PATTERNS.nodeModulePath, '[module]')
      .replace(SENSITIVE_PATTERNS.errorLineInfo, '')
      .replace(SENSITIVE_PATTERNS.electronInternal, '[internal]');
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    if (!sanitized || sanitized.length < 3) {
      return USER_FRIENDLY_MESSAGES.generic;
    }
    return sanitized;
  }
  static formatConnectionError(
    error: Error | string | unknown,
    options: ErrorFormatOptions = {},
  ): FormattedError {
    const errorMessage = this.extractErrorMessage(error);
    const technicalMessage = this.buildTechnicalMessage(errorMessage, options);
    this.errorLogger.error(
      `Erro de conexão${options.turnstileIdentifier ? ` [${options.turnstileIdentifier}]` : ''}${options.turnstileId ? ` (ID: ${options.turnstileId})` : ''}: ${errorMessage}`,
    );
    const userFriendlyMessage =
      this.getUserFriendlyConnectionMessage(errorMessage);
    let userMessage = userFriendlyMessage;
    if (options.turnstileIdentifier || options.turnstileId) {
      const identifier =
        options.turnstileIdentifier || `Catraca ${options.turnstileId}`;
      const idSuffix = options.turnstileId
        ? ` (ID: ${options.turnstileId})`
        : '';
      userMessage = `Erro de conexão com ${identifier}${idSuffix}: ${userFriendlyMessage}`;
    }
    return {
      userMessage,
      technicalMessage,
      code: this.extractErrorCode(error),
    };
  }
  static formatSyncError(
    error: Error | string | unknown,
    options: ErrorFormatOptions = {},
  ): FormattedError {
    const errorMessage = this.extractErrorMessage(error);
    const technicalMessage = this.buildTechnicalMessage(errorMessage, options);
    this.errorLogger.error(
      `Erro de sincronização${options.entityType ? ` [${options.entityType}]` : ''}: ${errorMessage}`,
    );
    const userFriendlyMessage = this.getUserFriendlySyncMessage(errorMessage);
    let userMessage = userFriendlyMessage;
    if (options.entityType) {
      userMessage = `Erro ao sincronizar ${options.entityType}: ${userFriendlyMessage}`;
    }
    return {
      userMessage,
      technicalMessage,
    };
  }
  static formatApiError(
    error: Error | string | unknown,
    options: ErrorFormatOptions = {},
  ): FormattedError {
    const errorMessage = this.extractErrorMessage(error);
    const technicalMessage = this.buildTechnicalMessage(errorMessage, options);
    const logParts: string[] = ['Erro de API'];
    if (options.httpStatus) {
      logParts.push(`[HTTP ${options.httpStatus}]`);
    }
    if (options.endpoint) {
      logParts.push(`[${options.endpoint}]`);
    }
    logParts.push(`: ${errorMessage}`);
    this.errorLogger.error(logParts.join(' '));
    const userFriendlyMessage = this.getUserFriendlyApiMessage(
      errorMessage,
      options.httpStatus,
    );
    return {
      userMessage: userFriendlyMessage,
      technicalMessage,
      httpStatus: options.httpStatus,
    };
  }
  static toSerializedError(
    error: Error | string | unknown,
    options: ErrorFormatOptions = {},
  ): SerializedError {
    const errorMessage = this.extractErrorMessage(error);
    const sanitizedMessage = this.sanitizeErrorMessage(errorMessage);
    return {
      message: sanitizedMessage,
      code: this.extractErrorCode(error) || 'UNKNOWN_ERROR',
      status: options.httpStatus ?? null,
      url: options.endpoint ?? null,
    };
  }
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    options: ErrorFormatOptions = {},
  ): Promise<
    { success: true; data: T } | { success: false; error: FormattedError }
  > {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const formattedError = this.formatGenericError(error, options);
      return { success: false, error: formattedError };
    }
  }
  static formatGenericError(
    error: Error | string | unknown,
    options: ErrorFormatOptions = {},
  ): FormattedError {
    const errorMessage = this.extractErrorMessage(error);
    const technicalMessage = this.buildTechnicalMessage(errorMessage, options);
    const sanitizedMessage = this.sanitizeErrorMessage(errorMessage);
    this.errorLogger.error(
      `Erro${options.context ? ` [${options.context}]` : ''}: ${errorMessage}`,
    );
    return {
      userMessage: sanitizedMessage,
      technicalMessage,
      code: this.extractErrorCode(error),
    };
  }
  private static extractErrorMessage(error: Error | string | unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return USER_FRIENDLY_MESSAGES.generic;
  }
  private static extractErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object') {
      if (
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
      ) {
        return (error as { code: string }).code;
      }
      if (
        'errno' in error &&
        typeof (error as { errno: unknown }).errno === 'string'
      ) {
        return (error as { errno: string }).errno;
      }
    }
    return undefined;
  }
  private static buildTechnicalMessage(
    errorMessage: string,
    options: ErrorFormatOptions,
  ): string {
    const parts: string[] = [];
    if (options.context) {
      parts.push(`[${options.context}]`);
    }
    if (options.turnstileId) {
      parts.push(`[Catraca ID: ${options.turnstileId}]`);
    }
    if (options.turnstileIdentifier) {
      parts.push(`[${options.turnstileIdentifier}]`);
    }
    if (options.httpStatus) {
      parts.push(`[HTTP ${options.httpStatus}]`);
    }
    if (options.endpoint) {
      parts.push(`[${options.endpoint}]`);
    }
    if (options.entityType) {
      parts.push(`[Entity: ${options.entityType}]`);
    }
    parts.push(errorMessage);
    return parts.join(' ');
  }
  private static getUserFriendlyConnectionMessage(
    errorMessage: string,
  ): string {
    const lowerMessage = errorMessage.toLowerCase();
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('etimedout')
    ) {
      return USER_FRIENDLY_MESSAGES.connection.timeout;
    }
    if (
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('refused')
    ) {
      return USER_FRIENDLY_MESSAGES.connection.refused;
    }
    if (lowerMessage.includes('econnreset') || lowerMessage.includes('reset')) {
      return USER_FRIENDLY_MESSAGES.connection.reset;
    }
    if (
      lowerMessage.includes('ehostunreach') ||
      lowerMessage.includes('enetunreach') ||
      lowerMessage.includes('unreachable')
    ) {
      return USER_FRIENDLY_MESSAGES.connection.unreachable;
    }
    return USER_FRIENDLY_MESSAGES.connection.generic;
  }
  private static getUserFriendlySyncMessage(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();
    if (
      lowerMessage.includes('server') &&
      (lowerMessage.includes('unavailable') || lowerMessage.includes('503'))
    ) {
      return USER_FRIENDLY_MESSAGES.sync.serverUnavailable;
    }
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('enotfound') ||
      lowerMessage.includes('err_network')
    ) {
      return USER_FRIENDLY_MESSAGES.sync.networkError;
    }
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('etimedout')
    ) {
      return USER_FRIENDLY_MESSAGES.sync.timeout;
    }
    if (lowerMessage.includes('conflict') || lowerMessage.includes('409')) {
      return USER_FRIENDLY_MESSAGES.sync.dataConflict;
    }
    return USER_FRIENDLY_MESSAGES.sync.generic;
  }
  private static getUserFriendlyApiMessage(
    errorMessage: string,
    httpStatus?: number,
  ): string {
    if (httpStatus) {
      switch (httpStatus) {
        case 400:
          return USER_FRIENDLY_MESSAGES.api.badRequest;
        case 401:
          return USER_FRIENDLY_MESSAGES.api.unauthorized;
        case 403:
          return USER_FRIENDLY_MESSAGES.api.forbidden;
        case 404:
          return USER_FRIENDLY_MESSAGES.api.notFound;
        case 500:
        case 502:
        case 503:
        case 504:
          return USER_FRIENDLY_MESSAGES.api.serverError;
      }
    }
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      return USER_FRIENDLY_MESSAGES.api.unauthorized;
    }
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
      return USER_FRIENDLY_MESSAGES.api.forbidden;
    }
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return USER_FRIENDLY_MESSAGES.api.notFound;
    }
    return USER_FRIENDLY_MESSAGES.api.generic;
  }
}
export const sanitizeErrorMessage =
  ErrorHandler.sanitizeErrorMessage.bind(ErrorHandler);
export const formatConnectionError =
  ErrorHandler.formatConnectionError.bind(ErrorHandler);
export const formatSyncError = ErrorHandler.formatSyncError.bind(ErrorHandler);
export const formatApiError = ErrorHandler.formatApiError.bind(ErrorHandler);
