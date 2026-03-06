import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import {
  TaskLocalPriorityService,
  TaskLocalPriority,
  InvalidPriorityError,
} from '../services/task-local-priority-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

/**
 * Controller for managing local task priorities via IPC.
 *
 * IPC Channels:
 * - task-local-priority:get - Get priority by externalId
 * - task-local-priority:set - Set priority for externalId
 * - task-local-priority:remove - Remove priority for externalId
 * - task-local-priority:get-batch - Get priorities for multiple externalIds
 *
 * Validates: Requirements 4.3, 4.5
 */
export class TaskLocalPriorityController extends BaseHandler {
  private service: TaskLocalPriorityService;

  constructor() {
    super();
    this.service = new TaskLocalPriorityService();
  }

  /**
   * Get local priority by work item external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The priority data or null if not found
   */
  @IpcMethod('task-local-priority:get')
  async get(
    externalId: string,
  ): Promise<ApiResponse<TaskLocalPriority | null>> {
    try {
      const result = await this.service.findByExternalId(externalId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar prioridade local';
      logger.error('TaskLocalPriorityController.get error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Set or update local priority for a work item.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param priority - The priority value (0-5, where 5 is most urgent)
   * @returns The created or updated priority data
   */
  @IpcMethod('task-local-priority:set')
  async set(
    externalId: string,
    priority: number,
  ): Promise<ApiResponse<TaskLocalPriority>> {
    try {
      const result = await this.service.setPriority(externalId, priority);
      return { success: true, data: result };
    } catch (error) {
      let message = 'Erro ao definir prioridade local';
      if (error instanceof InvalidPriorityError) {
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      logger.error('TaskLocalPriorityController.set error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Remove local priority for a work item.
   *
   * @param externalId - The Azure DevOps work item ID
   */
  @IpcMethod('task-local-priority:remove')
  async remove(externalId: string): Promise<ApiResponse<void>> {
    try {
      await this.service.removePriority(externalId);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao remover prioridade local';
      logger.error('TaskLocalPriorityController.remove error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Get local priorities for multiple work items.
   * Returns a map of externalId -> priority value.
   * Items without defined priority return 0.
   *
   * @param externalIds - Array of Azure DevOps work item IDs
   * @returns Map of externalId to priority value (serialized as object)
   */
  @IpcMethod('task-local-priority:get-batch')
  async getBatch(
    externalIds: string[],
  ): Promise<ApiResponse<Record<string, number>>> {
    try {
      const priorityMap = await this.service.findByExternalIds(externalIds);
      // Convert Map to plain object for IPC serialization
      const result: Record<string, number> = {};
      priorityMap.forEach((value, key) => {
        result[key] = value;
      });
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar prioridades locais em lote';
      logger.error('TaskLocalPriorityController.getBatch error:', error);
      return { success: false, error: message };
    }
  }
}
