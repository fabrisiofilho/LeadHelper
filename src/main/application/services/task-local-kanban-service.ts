import { TaskLocalKanbanRepository } from '../repositories/task-local-kanban-repository';
import { TaskLocalKanbanEntity } from '../entities/task-local-kanban.entity';
import { logger } from '@main/infrastructure/log/logger';

/**
 * DTO for local Kanban position data.
 */
export interface TaskLocalKanban {
  id: number;
  externalId: string;
  localColumn: string;
  localOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service for managing local Kanban positions.
 * Local positions are stored only in the local database, independent of Azure DevOps.
 * This allows users to simulate card movements without syncing to Azure DevOps.
 *
 * Validates: Requirements 18.3, 18.4
 */
export class TaskLocalKanbanService {
  private repository: TaskLocalKanbanRepository;

  constructor(repository?: TaskLocalKanbanRepository) {
    this.repository = repository ?? new TaskLocalKanbanRepository();
  }

  /**
   * Find a local Kanban position by the work item's external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The Kanban position data or null if not found
   */
  async findByExternalId(externalId: string): Promise<TaskLocalKanban | null> {
    logger.debug('[TaskLocalKanbanService.findByExternalId]', { externalId });

    const entity = await this.repository.findByExternalId(externalId);
    if (!entity) {
      return null;
    }

    return this.mapToDto(entity);
  }

  /**
   * Set or update the local Kanban position for a work item.
   * If a position already exists for the externalId, it will be updated.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param column - The Kanban column (e.g., "To Do", "In Progress", "Done")
   * @param order - The order within the column
   * @returns The created or updated Kanban position data
   */
  async setPosition(
    externalId: string,
    column: string,
    order: number,
  ): Promise<TaskLocalKanban> {
    logger.info('[TaskLocalKanbanService.setPosition]', {
      externalId,
      column,
      order,
    });

    const entity = await this.repository.setPosition(externalId, column, order);
    return this.mapToDto(entity);
  }

  /**
   * Reset (delete) the local Kanban position for a work item.
   * This returns the card to its original Azure DevOps status.
   *
   * @param externalId - The Azure DevOps work item ID
   */
  async resetPosition(externalId: string): Promise<void> {
    logger.info('[TaskLocalKanbanService.resetPosition]', { externalId });

    await this.repository.resetPosition(externalId);
  }

  /**
   * Find all local Kanban positions for a given context.
   * Returns all positions, optionally filtered by parent context.
   *
   * @param parentId - Optional parent work item ID to filter by context
   * @returns Array of Kanban position data
   */
  async findByContext(parentId?: number): Promise<TaskLocalKanban[]> {
    logger.debug('[TaskLocalKanbanService.findByContext]', { parentId });

    const entities = await this.repository.findByContext(parentId);
    return entities.map((entity) => this.mapToDto(entity));
  }

  /**
   * Map entity to DTO.
   */
  private mapToDto(entity: TaskLocalKanbanEntity): TaskLocalKanban {
    return {
      id: entity.id,
      externalId: entity.externalId,
      localColumn: entity.localColumn,
      localOrder: entity.localOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
