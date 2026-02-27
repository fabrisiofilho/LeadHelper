import { BaseRepository } from './base-repository';
import { TaskEntity, TaskStatus, TaskOrigin } from '../entities/task.entity';
import { EntityManager } from 'typeorm';
import { dateLte, dateGte } from '@main/infrastructure/utils/date-utils';

/**
 * Relations padrão para queries de tasks.
 * Sempre incluir sprint e team para evitar colunas vazias na UI.
 */
const TASK_RELATIONS = ['sprint', 'team', 'parent', 'children'] as const;

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

  async findByAssignedToEmail(email: string): Promise<TaskEntity[]> {
    return await this.find({
      where: { assignedToEmail: email },
      relations: [...TASK_RELATIONS],
    });
  }

  async findByParentId(parentId: number): Promise<TaskEntity[]> {
    return await this.find({
      where: { parentId },
      relations: [...TASK_RELATIONS],
    });
  }

  async findRootTasks(): Promise<TaskEntity[]> {
    return await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.sprint', 'sprint')
      .leftJoinAndSelect('task.team', 'team')
      .leftJoinAndSelect('task.children', 'children')
      .where('task.parent_id IS NULL')
      .orderBy('task.created_at', 'DESC')
      .getMany();
  }
}
