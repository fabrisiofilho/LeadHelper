import { Repository } from 'typeorm';
import { SprintEntity } from '../entities/sprint.entity';
import { getDataSource } from '@main/infrastructure/database/data-source';
import { toDateString } from '@main/infrastructure/utils/date-utils';

export interface SprintFilters {
  teamId?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export class SprintRepository {
  private _repository: Repository<SprintEntity> | null = null;

  private get repository(): Repository<SprintEntity> {
    if (!this._repository) {
      this._repository = getDataSource().getRepository(SprintEntity);
    }
    return this._repository;
  }

  async create(data: Partial<SprintEntity>): Promise<SprintEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: number,
    data: Partial<SprintEntity>,
  ): Promise<SprintEntity | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findById(id: number): Promise<SprintEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['team', 'tasks'],
    });
  }

  async findAll(filters?: SprintFilters): Promise<SprintEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.team', 'team')
      .leftJoinAndSelect('sprint.tasks', 'tasks');

    if (filters?.teamId !== undefined) {
      queryBuilder.andWhere('sprint.team_id = :teamId', {
        teamId: filters.teamId,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('sprint.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere(
        '(sprint.start_date <= :endDate AND sprint.end_date >= :startDate)',
        {
          startDate: toDateString(filters.startDate),
          endDate: toDateString(filters.endDate),
        },
      );
    } else if (filters?.startDate) {
      queryBuilder.andWhere('sprint.end_date >= :startDate', {
        startDate: toDateString(filters.startDate),
      });
    } else if (filters?.endDate) {
      queryBuilder.andWhere('sprint.start_date <= :endDate', {
        endDate: toDateString(filters.endDate),
      });
    }

    queryBuilder.orderBy('sprint.start_date', 'DESC');

    return queryBuilder.getMany();
  }

  async findByTeam(teamId: number): Promise<SprintEntity[]> {
    return this.repository.find({
      where: { teamId },
      relations: ['team', 'tasks'],
      order: { startDate: 'DESC' },
    });
  }

  async findCurrentSprint(teamId?: number): Promise<SprintEntity | null> {
    const todayStr = toDateString(new Date());

    const queryBuilder = this.repository
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.team', 'team')
      .leftJoinAndSelect('sprint.tasks', 'tasks')
      .where('sprint.start_date <= :today', { today: todayStr })
      .andWhere('sprint.end_date >= :today', { today: todayStr })
      .andWhere('sprint.is_active = :isActive', { isActive: true });

    if (teamId !== undefined) {
      queryBuilder.andWhere('sprint.team_id = :teamId', { teamId });
    }

    return queryBuilder.getOne();
  }

  async findUpcomingSprints(
    teamId?: number,
    limit: number = 5,
  ): Promise<SprintEntity[]> {
    const todayStr = toDateString(new Date());

    const queryBuilder = this.repository
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.team', 'team')
      .where('sprint.start_date > :today', { today: todayStr })
      .andWhere('sprint.is_active = :isActive', { isActive: true });

    if (teamId !== undefined) {
      queryBuilder.andWhere('sprint.team_id = :teamId', { teamId });
    }

    queryBuilder.orderBy('sprint.start_date', 'ASC').limit(limit);

    return queryBuilder.getMany();
  }

  async activate(id: number): Promise<SprintEntity | null> {
    await this.repository.update(id, { isActive: true });
    return this.findById(id);
  }

  async deactivate(id: number): Promise<SprintEntity | null> {
    await this.repository.update(id, { isActive: false });
    return this.findById(id);
  }

  async findByConfigId(configId: number): Promise<SprintEntity[]> {
    return this.repository.find({
      where: { azureDevOpsConfigId: configId },
      relations: ['team'],
      order: { startDate: 'DESC' },
    });
  }
}
