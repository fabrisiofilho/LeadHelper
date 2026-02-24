import { BaseRepository } from './base-repository';
import { AllocationEntity } from '../entities/allocation.entity';
import { EntityManager } from 'typeorm';
import { dateLte, dateGte } from '@main/infrastructure/utils/date-utils';

export class AllocationRepository extends BaseRepository<AllocationEntity> {
  constructor(manager?: EntityManager) {
    super(AllocationEntity, manager);
  }

  /**
   * Find all allocations for a specific team member
   */
  async findByTeamMember(teamMemberId: number): Promise<AllocationEntity[]> {
    return await this.find({
      where: { teamMemberId },
      relations: ['teamMember', 'task', 'task.sprint'],
    });
  }

  /**
   * Find all allocations for a specific task
   */
  async findByTask(taskId: number): Promise<AllocationEntity[]> {
    return await this.find({
      where: { taskId },
      relations: ['teamMember', 'task', 'task.sprint'],
    });
  }

  /**
   * Find allocations that overlap with the given period.
   * An allocation overlaps if: allocation.startDate <= endDate AND allocation.endDate >= startDate
   */
  async findByPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<AllocationEntity[]> {
    return await this.find({
      where: {
        startDate: dateLte(endDate),
        endDate: dateGte(startDate),
      },
      relations: ['teamMember', 'task', 'task.sprint', 'task.team'],
    });
  }

  /**
   * Find allocations for a team member that overlap with the given period.
   * Useful for workload calculation.
   */
  async findOverlapping(
    teamMemberId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<AllocationEntity[]> {
    return await this.find({
      where: {
        teamMemberId,
        startDate: dateLte(endDate),
        endDate: dateGte(startDate),
      },
      relations: ['teamMember', 'task', 'task.sprint'],
    });
  }
}
