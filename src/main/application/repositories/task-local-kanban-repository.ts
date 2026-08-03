import { BaseRepository } from './base-repository';
import { TaskLocalKanbanEntity } from '../entities/task-local-kanban.entity';
import { EntityManager } from 'typeorm';

/**
 * Repository for managing local Kanban positions.
 * Local positions are stored only in the local database, independent of Azure DevOps.
 * This allows users to simulate card movements without syncing to Azure DevOps.
 *
 * Validates: Requirements 18.4
 */
export class TaskLocalKanbanRepository extends BaseRepository<TaskLocalKanbanEntity> {
  constructor(manager?: EntityManager) {
    super(TaskLocalKanbanEntity, manager);
  }

  /**
   * Find a local Kanban position by the work item's external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The Kanban position entity or null if not found
   */
  async findByExternalId(
    externalId: string,
  ): Promise<TaskLocalKanbanEntity | null> {
    return await this.findOneBy({ externalId });
  }

  /**
   * Set or update the local Kanban position for a work item.
   * If a position already exists for the externalId, it will be updated.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param column - The Kanban column (e.g., "To Do", "In Progress", "Done")
   * @param order - The order within the column
   * @returns The created or updated Kanban position entity
   */
  async setPosition(
    externalId: string,
    column: string,
    order: number,
  ): Promise<TaskLocalKanbanEntity> {
    const existing = await this.findByExternalId(externalId);

    if (existing) {
      // Update existing record
      await this.update(
        { externalId },
        { localColumn: column, localOrder: order },
      );
      // Return updated entity
      const updated = await this.findByExternalId(externalId);
      return updated!;
    }

    // Create new record
    return await this.save({
      externalId,
      localColumn: column,
      localOrder: order,
    });
  }

  /**
   * Reset (delete) the local Kanban position for a work item.
   * This returns the card to its original Azure DevOps status.
   *
   * @param externalId - The Azure DevOps work item ID
   */
  async resetPosition(externalId: string): Promise<void> {
    await this.delete({ externalId });
  }

  /**
   * Find all local Kanban positions for a given context.
   * Currently returns all positions, but can be extended to filter by parentId
   * when the relationship is established.
   *
   * @param _parentId - Optional parent work item ID to filter by context (reserved for future use)
   * @returns Array of Kanban position entities
   */
  async findByContext(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parentId?: number,
  ): Promise<TaskLocalKanbanEntity[]> {
    // Currently returns all positions
    // In the future, this could be extended to filter by parent context
    // when we have a relationship between kanban positions and parent items
    return await this.find();
  }
}
