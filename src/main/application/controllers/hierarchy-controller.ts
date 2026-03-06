import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import {
  HierarchyService,
  BreadcrumbItem,
} from '../services/hierarchy-service';
import { TaskEntity } from '../entities/task.entity';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

/**
 * Controller for managing hierarchical navigation via IPC.
 * Exposes hierarchy operations for drill-down navigation and breadcrumb construction.
 *
 * IPC Channels:
 * - hierarchy:get-children - Get direct children of a work item
 * - hierarchy:count-children - Count direct children of a work item
 * - hierarchy:build-breadcrumb - Build breadcrumb trail for a work item
 * - hierarchy:get-root-items - Get root items filtered by area path pattern
 *
 * Validates: Requirements 15.1, 15.7, 16.1
 */
export class HierarchyController extends BaseHandler {
  private service: HierarchyService;

  constructor() {
    super();
    this.service = new HierarchyService();
  }

  /**
   * Get direct children of a work item.
   *
   * Property 3: Returns all and only work items where parent_id = parentId.
   *
   * @param parentId - The ID of the parent work item
   * @returns Array of child TaskEntity objects
   */
  @IpcMethod('hierarchy:getChildren')
  async getChildren(parentId: number): Promise<ApiResponse<TaskEntity[]>> {
    try {
      const result = await this.service.getChildren(parentId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar filhos do item';
      logger.error('HierarchyController.getChildren error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Count direct children of a work item.
   *
   * Property 6: Counter reflects the actual count of records where parent_id = parentId.
   *
   * @param parentId - The ID of the parent work item
   * @returns The count of child work items
   */
  @IpcMethod('hierarchy:countChildren')
  async countChildren(parentId: number): Promise<ApiResponse<number>> {
    try {
      const result = await this.service.countChildren(parentId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao contar filhos do item';
      logger.error('HierarchyController.countChildren error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Build a complete breadcrumb trail from root to the specified task.
   *
   * Property 30: Breadcrumb contains all ancestors in correct order (root → ... → parent → current item).
   * Property 32: Titles > 30 characters are truncated to 27 chars + "...".
   *
   * @param taskId - The ID of the task to build breadcrumb for
   * @returns Array of BreadcrumbItem from root to current task
   */
  @IpcMethod('hierarchy:buildBreadcrumb')
  async buildBreadcrumb(
    taskId: number,
  ): Promise<ApiResponse<BreadcrumbItem[]>> {
    try {
      const result = await this.service.buildBreadcrumb(taskId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao construir breadcrumb';
      logger.error('HierarchyController.buildBreadcrumb error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Get root work items filtered by area path pattern.
   * Root items are those without a parent (parent_id IS NULL).
   *
   * @param areaPathPattern - SQL LIKE pattern for area_path (e.g., 'Tribo SEIF\\Sustentação\\%')
   * @returns Array of root TaskEntity objects matching the area path
   */
  @IpcMethod('hierarchy:getRootItems')
  async getRootItems(
    areaPathPattern: string,
  ): Promise<ApiResponse<TaskEntity[]>> {
    try {
      const result = await this.service.getRootItemsByArea(areaPathPattern);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao buscar itens raiz';
      logger.error('HierarchyController.getRootItems error:', error);
      return { success: false, error: message };
    }
  }
}
