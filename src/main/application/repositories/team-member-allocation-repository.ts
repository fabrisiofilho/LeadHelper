import { BaseRepository } from './base-repository';
import { TeamMemberAllocationEntity } from '../entities/team-member-allocation.entity';
import { EntityManager } from 'typeorm';
import { toDateString } from '@main/infrastructure/utils/date-utils';
import { logger } from '@main/infrastructure/log/logger';

export interface TeamMemberAllocationFilters {
  teamId?: number;
  teamMemberId?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export class TeamMemberAllocationRepository extends BaseRepository<TeamMemberAllocationEntity> {
  constructor(manager?: EntityManager) {
    super(TeamMemberAllocationEntity, manager);
  }

  /**
   * Find all allocations for a specific team
   */
  async findByTeam(teamId: number): Promise<TeamMemberAllocationEntity[]> {
    return await this.find({
      where: { teamId },
      relations: ['teamMember', 'team'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Find all allocations for a specific team member
   */
  async findByTeamMember(
    teamMemberId: number,
  ): Promise<TeamMemberAllocationEntity[]> {
    return await this.find({
      where: { teamMemberId },
      relations: ['teamMember', 'team'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Find active allocations for a team (current date within allocation period).
   * Uses createQueryBuilder for reliable SQLite date comparison.
   */
  async findActiveByTeam(
    teamId: number,
    referenceDate?: Date,
  ): Promise<TeamMemberAllocationEntity[]> {
    const dateStr = toDateString(referenceDate ?? new Date());

    logger.info('[findActiveByTeam]', { teamId, dateStr });

    return await this.repository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.teamMember', 'teamMember')
      .leftJoinAndSelect('allocation.team', 'team')
      .where('allocation.team_id = :teamId', { teamId })
      .andWhere('allocation.is_active = 1')
      .andWhere('allocation.start_date <= :dateStr', { dateStr })
      .andWhere(
        '(allocation.end_date IS NULL OR allocation.end_date >= :dateStr)',
        { dateStr },
      )
      .orderBy('allocation.start_date', 'DESC')
      .getMany();
  }

  /**
   * Find active allocations for a team member.
   * Uses createQueryBuilder for reliable SQLite date comparison.
   */
  async findActiveByTeamMember(
    teamMemberId: number,
    referenceDate?: Date,
  ): Promise<TeamMemberAllocationEntity[]> {
    const dateStr = toDateString(referenceDate ?? new Date());

    return await this.repository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.teamMember', 'teamMember')
      .leftJoinAndSelect('allocation.team', 'team')
      .where('allocation.team_member_id = :teamMemberId', { teamMemberId })
      .andWhere('allocation.is_active = 1')
      .andWhere('allocation.start_date <= :dateStr', { dateStr })
      .andWhere(
        '(allocation.end_date IS NULL OR allocation.end_date >= :dateStr)',
        { dateStr },
      )
      .orderBy('allocation.start_date', 'DESC')
      .getMany();
  }

  /**
   * Find active allocations for a member across ALL teams that overlap with a given period.
   * Used for cross-team uniqueness validation.
   */
  async findOverlappingCrossTeam(
    teamMemberId: number,
    startDate: Date,
    endDate?: Date,
    excludeId?: number,
  ): Promise<TeamMemberAllocationEntity[]> {
    const startStr = toDateString(startDate);
    const endStr = endDate ? toDateString(endDate) : '2099-12-31';

    const qb = this.repository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.team', 'team')
      .where('allocation.team_member_id = :teamMemberId', { teamMemberId })
      .andWhere('allocation.is_active = 1')
      .andWhere('allocation.start_date <= :endStr', { endStr })
      .andWhere(
        '(allocation.end_date IS NULL OR allocation.end_date >= :startStr)',
        { startStr },
      );

    if (excludeId) {
      qb.andWhere('allocation.id != :excludeId', { excludeId });
    }

    return await qb.getMany();
  }

  /**
   * Find allocations that overlap with a given period
   */
  async findOverlapping(
    teamMemberId: number,
    teamId: number,
    startDate: Date,
    endDate?: Date,
    excludeId?: number,
  ): Promise<TeamMemberAllocationEntity[]> {
    const startStr = toDateString(startDate);
    const endStr = endDate ? toDateString(endDate) : '2099-12-31';

    const qb = this.repository
      .createQueryBuilder('allocation')
      .where('allocation.team_member_id = :teamMemberId', { teamMemberId })
      .andWhere('allocation.team_id = :teamId', { teamId })
      .andWhere('allocation.is_active = 1')
      .andWhere('allocation.start_date <= :endStr', { endStr })
      .andWhere(
        '(allocation.end_date IS NULL OR allocation.end_date >= :startStr)',
        { startStr },
      );

    if (excludeId) {
      qb.andWhere('allocation.id != :excludeId', { excludeId });
    }

    return await qb.getMany();
  }

  /**
   * Find allocations with filters
   */
  async findWithFilters(
    filters: TeamMemberAllocationFilters,
  ): Promise<TeamMemberAllocationEntity[]> {
    const qb = this.repository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.teamMember', 'teamMember')
      .leftJoinAndSelect('allocation.team', 'team');

    if (filters.teamId !== undefined) {
      qb.andWhere('allocation.team_id = :teamId', { teamId: filters.teamId });
    }

    if (filters.teamMemberId !== undefined) {
      qb.andWhere('allocation.team_member_id = :teamMemberId', {
        teamMemberId: filters.teamMemberId,
      });
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('allocation.is_active = :isActive', {
        isActive: filters.isActive ? 1 : 0,
      });
    }

    if (filters.startDate) {
      qb.andWhere(
        '(allocation.end_date IS NULL OR allocation.end_date >= :startDate)',
        { startDate: toDateString(filters.startDate) },
      );
    }

    if (filters.endDate) {
      qb.andWhere('allocation.start_date <= :endDate', {
        endDate: toDateString(filters.endDate),
      });
    }

    return await qb.orderBy('allocation.start_date', 'DESC').getMany();
  }
}
