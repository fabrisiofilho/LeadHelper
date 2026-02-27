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
    return await this.findOne({
      where: { email },
      relations: ['position'],
    });
  }

  async findByRole(role: TeamMemberRole): Promise<TeamMemberEntity[]> {
    return await this.find({
      where: { role },
      relations: ['position'],
    });
  }

  async findActive(): Promise<TeamMemberEntity[]> {
    return await this.find({
      where: { isActive: true },
      relations: ['position'],
    });
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

    return await this.find({
      where,
      relations: ['position'],
    });
  }

  async findOneBy(
    where: Partial<TeamMemberEntity>,
  ): Promise<TeamMemberEntity | null> {
    return await this.findOne({
      where,
      relations: ['position'],
    });
  }

  async find(options?: any): Promise<TeamMemberEntity[]> {
    if (!options) {
      return await this.repository.find({ relations: ['position'] });
    }
    if (!options.relations) {
      options.relations = ['position'];
    }
    return await this.repository.find(options);
  }
}
