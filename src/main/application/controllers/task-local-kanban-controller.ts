import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import {
  TaskLocalKanbanService,
  TaskLocalKanban,
} from '../services/task-local-kanban-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

/**
 * Controller for managing local Kanban positions via IPC.
 * Local positions allow users to simulate card movements without syncing to Azure DevOps.
 *
 * IPC Channels:
 * - task-local-kanban:get-position - Get position by externalId
 * - task-local-kanban:set-position - Set position (column, order) for externalId
 * - task-local-kanban:reset-position - Reset position for externalId
 * - task-local-kanban:get-by-context - Get all positions for a context (parentId)
 *
 * Validates: Requirements 18.3, 18.4
 */
export class TaskLocalKanbanController extends BaseHandler {
  private service: TaskLocalKanbanService;

  constructor() {
    super();
    this.service = new TaskLocalKanbanService();
  }

  /**
   * Get local Kanban position by work item external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The Kanban position data or null if not found
   */
  @IpcMethod('task-local-kanban:get-position')
  async getPosition(
    externalId: string,
  ): Promise<ApiResponse<TaskLocalKanban | null>> {
    try {
      const result = await this.service.findByExternalId(externalId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar posição local do Kanban';
      logger.error('TaskLocalKanbanController.getPosition error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Set or update local Kanban position for a work item.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param column - The Kanban column (e.g., "To Do", "In Progress", "Done")
   * @param order - The order within the column
   * @returns The created or updated Kanban position data
   */
  @IpcMethod('task-local-kanban:set-position')
  async setPosition(
    externalId: string,
    column: string,
    order: number,
  ): Promise<ApiResponse<TaskLocalKanban>> {
    try {
      const result = await this.service.setPosition(externalId, column, order);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao definir posição local do Kanban';
      logger.error('TaskLocalKanbanController.setPosition error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Reset (delete) local Kanban position for a work item.
   * This returns the card to its original Azure DevOps status.
   *
   * @param externalId - The Azure DevOps work item ID
   */
  @IpcMethod('task-local-kanban:reset-position')
  async resetPosition(externalId: string): Promise<ApiResponse<void>> {
    try {
      await this.service.resetPosition(externalId);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao resetar posição local do Kanban';
      logger.error('TaskLocalKanbanController.resetPosition error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Get all local Kanban positions for a given context.
   * Returns all positions, optionally filtered by parent context.
   *
   * @param parentId - Optional parent work item ID to filter by context
   * @returns Array of Kanban position data
   */
  @IpcMethod('task-local-kanban:get-by-context')
  async getByContext(
    parentId?: number,
  ): Promise<ApiResponse<TaskLocalKanban[]>> {
    try {
      const result = await this.service.findByContext(parentId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar posições locais do Kanban por contexto';
      logger.error('TaskLocalKanbanController.getByContext error:', error);
      return { success: false, error: message };
    }
  }
}
