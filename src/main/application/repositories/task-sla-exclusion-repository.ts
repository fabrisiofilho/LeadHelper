import { BaseRepository } from './base-repository';
import { TaskSlaExclusionEntity } from '../entities/task-sla-exclusion.entity';
import { In } from 'typeorm';

export class TaskSlaExclusionRepository extends BaseRepository<TaskSlaExclusionEntity> {
  constructor() {
    super(TaskSlaExclusionEntity);
  }

  async findByExternalId(
    externalId: string,
  ): Promise<TaskSlaExclusionEntity | null> {
    return await this.findOneBy({ externalId });
  }

  async findByExternalIds(externalIds: string[]): Promise<Set<string>> {
    if (externalIds.length === 0) return new Set();
    const entities = await this.find({
      where: { externalId: In(externalIds) },
    });
    return new Set(entities.map((e) => e.externalId));
  }

  async exclude(
    externalId: string,
    reason?: string,
  ): Promise<TaskSlaExclusionEntity> {
    const existing = await this.findByExternalId(externalId);
    if (existing) {
      await this.update({ externalId }, { reason });
      return (await this.findByExternalId(externalId))!;
    }
    return await this.save({ externalId, reason });
  }

  async restore(externalId: string): Promise<void> {
    await this.delete({ externalId });
  }
}
