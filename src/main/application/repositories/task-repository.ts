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

  /**
   * Batch version of findByParentId — one query for all parent IDs.
   * Returns a Map<parentId, children[]> for O(1) lookup.
   */
  async findByParentIds(
    parentIds: number[],
  ): Promise<Map<number, TaskEntity[]>> {
    if (parentIds.length === 0) return new Map();
    const tasks = await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.sprint', 'sprint')
      .leftJoinAndSelect('task.team', 'team')
      .where('task.parent_id IN (:...ids)', { ids: parentIds })
      .getMany();
    const map = new Map<number, TaskEntity[]>();
    for (const t of tasks) {
      if (t.parentId == null) continue;
      const list = map.get(t.parentId) ?? [];
      list.push(t);
      map.set(t.parentId, list);
    }
    return map;
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

  async findOpenByAreaAndTypes(
    areaPathPrefix: string,
    validTypes: string[],
    closedStatuses: string[],
  ): Promise<TaskEntity[]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.sprint', 'sprint')
      .leftJoinAndSelect('task.team', 'team')
      .leftJoinAndSelect('task.children', 'children')
      .where('task.area_path LIKE :area', { area: `${areaPathPrefix}%` })
      .andWhere('task.type IN (:...types)', { types: validTypes });

    if (closedStatuses.length > 0) {
      qb.andWhere('task.status NOT IN (:...closed)', {
        closed: closedStatuses,
      });
    }

    return qb.getMany();
  }

  /**
   * Find open tasks filtered by Azure DevOps project config AND area path prefix.
   * Includes tasks with null azureDevOpsConfigId (legacy data) when they match the area path.
   */
  async findOpenByConfigAndArea(
    configId: number,
    areaPathPrefix: string,
    validTypes: string[],
    closedStatuses: string[],
  ): Promise<TaskEntity[]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.sprint', 'sprint')
      .leftJoinAndSelect('task.team', 'team')
      .leftJoinAndSelect('task.children', 'children')
      .where('task.area_path LIKE :area', { area: `${areaPathPrefix}%` })
      .andWhere('task.type IN (:...types)', { types: validTypes })
      .andWhere(
        '(task.azure_devops_config_id = :configId OR task.azure_devops_config_id IS NULL)',
        { configId },
      );

    if (closedStatuses.length > 0) {
      qb.andWhere('task.status NOT IN (:...closed)', {
        closed: closedStatuses,
      });
    }

    return qb.getMany();
  }

  /**
   * Find tasks filtered by Azure DevOps project config id (for task management / allocation).
   */
  async findByConfigId(configId: number): Promise<TaskEntity[]> {
    return await this.find({
      where: { azureDevOpsConfigId: configId },
      relations: [...TASK_RELATIONS],
    });
  }

  async searchByText(query: string, limit = 50): Promise<TaskEntity[]> {
    return await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.sprint', 'sprint')
      .leftJoinAndSelect('task.team', 'team')
      .where('(task.title LIKE :q OR task.external_id LIKE :q)', {
        q: `%${query}%`,
      })
      .orderBy('task.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }
}
