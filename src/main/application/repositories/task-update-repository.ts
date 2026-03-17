import { BaseRepository } from './base-repository';
import { TaskUpdateEntity } from '../entities/task-update.entity';
import { EntityManager } from 'typeorm';

export class TaskUpdateRepository extends BaseRepository<TaskUpdateEntity> {
  constructor(manager?: EntityManager) {
    super(TaskUpdateEntity, manager);
  }

  /**
   * Find all updates for a given task, ordered by changedDate descending (most recent first).
   * Validates: Requirement 4.1 (chronological descending order)
   */
  async findByTaskId(taskId: number): Promise<TaskUpdateEntity[]> {
    return await this.find({
      where: { taskId },
      order: { changedDate: 'DESC' },
    });
  }

  /**
   * Create or update a task update record.
   * Uses externalWorkItemId + revision + fieldName as the composite natural key
   * to determine if a record already exists.
   */
  async upsert(entity: Partial<TaskUpdateEntity>): Promise<TaskUpdateEntity> {
    const existing = await this.findOneBy({
      externalWorkItemId: entity.externalWorkItemId!,
      revision: entity.revision!,
      fieldName: entity.fieldName!,
    });

    if (existing) {
      await this.update(
        { id: existing.id },
        {
          taskId: entity.taskId,
          changedDate: entity.changedDate,
          changedBy: entity.changedBy,
          oldValue: entity.oldValue,
          newValue: entity.newValue,
        },
      );
      const updated = await this.findOneBy({ id: existing.id });
      return updated!;
    }

    return await this.save(entity);
  }
}
