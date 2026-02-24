import { BaseRepository } from './base-repository';
import { TaskEntity, TaskStatus, TaskOrigin } from '../entities/task.entity';
import { AllocationEntity } from '../entities/allocation.entity';
import { EntityManager } from 'typeorm';
import { getDataSource } from '@main/infrastructure/database/data-source';
import { dateLte, dateGte } from '@main/infrastructure/utils/date-utils';

/**
 * Relations padrão para queries de tasks.
 * Sempre incluir sprint e team para evitar colunas vazias na UI.
 */
const TASK_RELATIONS = ['sprint', 'team'] as const;

export class TaskRepository extends BaseRepository<TaskEntity> {
  constructor(manager?: EntityManager) {
    super(TaskEntity, manager);
  }

  async findByStatus(status: TaskStatus): Promise<TaskEntity[]> {
    return await this.find({
      where: { status },
      relations: [...TASK_RELATIONS],
    });
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<TaskEntity[]> {
    return await this.find({
      where: {
        startDate: dateLte(endDate),
        endDate: dateGte(startDate),
      },
      relations: [...TASK_RELATIONS],
    });
  }

  async findByOrigin(origin: TaskOrigin): Promise<TaskEntity[]> {
    return await this.find({
      where: { origin },
      relations: [...TASK_RELATIONS],
    });
  }

  async findBySprint(sprintId: number): Promise<TaskEntity[]> {
    return await this.find({
      where: { sprintId },
      relations: [...TASK_RELATIONS],
    });
  }

  async findAllWithRelations(): Promise<TaskEntity[]> {
    return await this.find({
      relations: [...TASK_RELATIONS],
      order: { createdAt: 'DESC' },
    });
  }

  async hasAllocations(taskId: number): Promise<boolean> {
    const dataSource = getDataSource();
    const allocationRepository = dataSource.getRepository(AllocationEntity);
    const count = await allocationRepository.count({ where: { taskId } });
    return count > 0;
  }
}
