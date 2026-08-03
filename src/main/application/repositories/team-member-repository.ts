import { BaseRepository } from './base-repository';
import {
  TeamMemberEntity,
  TeamMemberRole,
} from '../entities/team-member.entity';
import { EntityManager, FindManyOptions } from 'typeorm';

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

  /**
   * Batch fetch members by a list of emails — one IN query instead of N queries.
   * Returns a Map<email_lowercase, entity> for O(1) lookup.
   */
  async findByEmails(emails: string[]): Promise<Map<string, TeamMemberEntity>> {
    if (emails.length === 0) return new Map();
    const entities = await this.repository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.position', 'position')
      .where('LOWER(m.email) IN (:...emails)', {
        emails: emails.map((e) => e.toLowerCase()),
      })
      .getMany();
    const map = new Map<string, TeamMemberEntity>();
    for (const e of entities) {
      if (e.email) map.set(e.email.toLowerCase(), e);
    }
    return map;
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

  async find(
    options?: FindManyOptions<TeamMemberEntity>,
  ): Promise<TeamMemberEntity[]> {
    if (!options) {
      return await this.repository.find({ relations: ['position'] });
    }
    if (!options.relations) {
      options.relations = ['position'];
    }
    return await this.repository.find(options);
  }
}
