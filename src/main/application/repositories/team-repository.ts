import { Repository } from 'typeorm';
import { TeamEntity } from '../entities/team.entity';
import { TeamMemberEntity } from '../entities/team-member.entity';
import { getDataSource } from '@main/infrastructure/database/data-source';

export class TeamRepository {
  private _repository: Repository<TeamEntity> | null = null;

  private get repository(): Repository<TeamEntity> {
    if (!this._repository) {
      this._repository = getDataSource().getRepository(TeamEntity);
    }
    return this._repository;
  }

  async create(data: Partial<TeamEntity>): Promise<TeamEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: number,
    data: Partial<TeamEntity>,
  ): Promise<TeamEntity | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findById(id: number): Promise<TeamEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['members'],
    });
  }

  async findByName(name: string): Promise<TeamEntity | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(filters?: { isActive?: boolean }): Promise<TeamEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    return this.repository.find({
      where,
      order: { name: 'ASC' },
      relations: ['members'],
    });
  }

  async activate(id: number): Promise<TeamEntity | null> {
    await this.repository.update(id, { isActive: true });
    return this.findById(id);
  }

  async deactivate(id: number): Promise<TeamEntity | null> {
    await this.repository.update(id, { isActive: false });
    return this.findById(id);
  }

  async addMember(teamId: number, memberId: number): Promise<boolean> {
    const team = await this.repository.findOne({
      where: { id: teamId },
      relations: ['members'],
    });
    if (!team) return false;

    const memberRepo = getDataSource().getRepository(TeamMemberEntity);
    const member = await memberRepo.findOne({ where: { id: memberId } });
    if (!member) return false;

    if (!team.members) team.members = [];
    if (!team.members.find((m) => m.id === memberId)) {
      team.members.push(member);
      await this.repository.save(team);
    }
    return true;
  }

  async removeMember(teamId: number, memberId: number): Promise<boolean> {
    const team = await this.repository.findOne({
      where: { id: teamId },
      relations: ['members'],
    });
    if (!team || !team.members) return false;

    team.members = team.members.filter((m) => m.id !== memberId);
    await this.repository.save(team);
    return true;
  }
}
