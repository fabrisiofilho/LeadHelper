import { BaseRepository } from './base-repository';
import { TaskHiddenEntity } from '../entities/task-hidden.entity';
import { In } from 'typeorm';

export class TaskHiddenRepository extends BaseRepository<TaskHiddenEntity> {
  constructor() {
    super(TaskHiddenEntity);
  }

  async findByExternalIds(externalIds: string[]): Promise<Set<string>> {
    if (externalIds.length === 0) return new Set();
    const entities = await this.find({ where: { externalId: In(externalIds) } });
    return new Set(entities.map((e) => e.externalId));
  }

  async hide(externalId: string, reason?: string): Promise<TaskHiddenEntity> {
    const existing = await this.findOneBy({ externalId });
    if (existing) {
      await this.update({ externalId }, { reason });
      return (await this.findOneBy({ externalId }))!;
    }
    return await this.save({ externalId, reason });
  }

  async unhide(externalId: string): Promise<void> {
    await this.delete({ externalId });
  }
}
