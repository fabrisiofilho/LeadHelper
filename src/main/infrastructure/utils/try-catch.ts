import { logger } from '@main/infrastructure/log/logger';
import { ApiResponse } from '../../../shared/interfaces/types/common.types';

export function wrap<T, A extends unknown[]>(fn: (...args: A) => Promise<T>) {
  return async (...args: A): Promise<ApiResponse<T>> => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };
}

export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage: string,
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : errorMessage;
    logger.error(`${errorMessage}: ${message}`);
    return { success: false, error: message };
  }
}
