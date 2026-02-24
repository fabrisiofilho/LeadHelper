import { BaseRepository } from './base-repository';
import {
  TeamMemberEntity,
  TeamMemberRole,
} from '../entities/team-member.entity';
import { EntityManager } from 'typeorm';

export interface TeamMemberFilters {
  role?: TeamMemberRole;
  isActive?: boolean;
}

export class TeamMemberRepository extends BaseRepository<TeamMemberEntity> {
  constructor(manager?: EntityManager) {
    super(TeamMemberEntity, manager);
  }

  async findByEmail(email: string): Promise<TeamMemberEntity | null> {
    return await this.findOneBy({ email });
  }

  async findByRole(role: TeamMemberRole): Promise<TeamMemberEntity[]> {
    return await this.find({ where: { role } });
  }

  async findActive(): Promise<TeamMemberEntity[]> {
    return await this.find({ where: { isActive: true } });
  }

  async findWithFilters(
    filters: TeamMemberFilters,
  ): Promise<TeamMemberEntity[]> {
    const where: { role?: TeamMemberRole; isActive?: boolean } = {};

    if (filters.role !== undefined) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await this.find({ where, relations: ['teams'] });
  }
}
