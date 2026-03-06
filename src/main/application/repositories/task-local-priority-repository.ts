import { BaseRepository } from './base-repository';
import { TaskLocalPriorityEntity } from '../entities/task-local-priority.entity';
import { EntityManager, In } from 'typeorm';

/**
 * Repository for managing local task priorities.
 * Local priorities are stored only in the local database, independent of Azure DevOps.
 *
 * Implements Property 24: Upsert behavior to avoid duplicates on external_id.
 * Validates: Requirements 11.4
 */
export class TaskLocalPriorityRepository extends BaseRepository<TaskLocalPriorityEntity> {
  constructor(manager?: EntityManager) {
    super(TaskLocalPriorityEntity, manager);
  }

  /**
   * Find a local priority by the work item's external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The priority entity or null if not found
   */
  async findByExternalId(
    externalId: string,
  ): Promise<TaskLocalPriorityEntity | null> {
    return await this.findOneBy({ externalId });
  }

  /**
   * Find local priorities for multiple work items.
   * Returns a Map of externalId -> localPriority for efficient lookup.
   *
   * @param externalIds - Array of Azure DevOps work item IDs
   * @returns Map of externalId to priority value
   */
  async findByExternalIds(externalIds: string[]): Promise<Map<string, number>> {
    if (externalIds.length === 0) {
      return new Map();
    }

    const entities = await this.find({
      where: { externalId: In(externalIds) },
    });

    const priorityMap = new Map<string, number>();
    for (const entity of entities) {
      priorityMap.set(entity.externalId, entity.localPriority);
    }

    return priorityMap;
  }

  /**
   * Insert or update a local priority for a work item.
   * If a priority already exists for the externalId, it will be updated.
   * This implements Property 24: Upsert to avoid duplicates.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param priority - The priority value (0-5)
   * @returns The created or updated priority entity
   */
  async upsert(
    externalId: string,
    priority: number,
  ): Promise<TaskLocalPriorityEntity> {
    const existing = await this.findByExternalId(externalId);

    if (existing) {
      // Update existing record
      await this.update({ externalId }, { localPriority: priority });
      // Return updated entity
      const updated = await this.findByExternalId(externalId);
      return updated!;
    }

    // Create new record
    return await this.save({
      externalId,
      localPriority: priority,
    });
  }

  /**
   * Delete a local priority by external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   */
  async deleteByExternalId(externalId: string): Promise<void> {
    await this.delete({ externalId });
  }
}
