import { TeamRepository } from '../repositories/team-repository';
import { TeamEntity } from '../entities/team.entity';
import { logger } from '@main/infrastructure/log/logger';

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
}

export interface TeamFilters {
  isActive?: boolean;
}

export class TeamService {
  private repository: TeamRepository;

  constructor() {
    this.repository = new TeamRepository();
  }

  async create(data: CreateTeamInput): Promise<TeamEntity> {
    logger.info('Creating team', { name: data.name });

    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error(`Equipe com nome "${data.name}" já existe`);
    }

    return this.repository.create({
      name: data.name,
      description: data.description,
      isActive: true,
    });
  }

  async update(id: number, data: UpdateTeamInput): Promise<TeamEntity> {
    logger.info('Updating team', { id, data });

    const team = await this.repository.findById(id);
    if (!team) {
      throw new Error('Equipe não encontrada');
    }

    if (data.name && data.name !== team.name) {
      const existing = await this.repository.findByName(data.name);
      if (existing) {
        throw new Error(`Equipe com nome "${data.name}" já existe`);
      }
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error('Erro ao atualizar equipe');
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    logger.info('Deleting team', { id });

    const team = await this.repository.findById(id);
    if (!team) {
      throw new Error('Equipe não encontrada');
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Erro ao excluir equipe');
    }
  }

  async findById(id: number): Promise<TeamEntity | null> {
    return this.repository.findById(id);
  }

  async findAll(filters?: TeamFilters): Promise<TeamEntity[]> {
    return this.repository.findAll(filters);
  }

  async activate(id: number): Promise<TeamEntity> {
    logger.info('Activating team', { id });

    const team = await this.repository.activate(id);
    if (!team) {
      throw new Error('Equipe não encontrada');
    }

    return team;
  }

  async deactivate(id: number): Promise<TeamEntity> {
    logger.info('Deactivating team', { id });

    const team = await this.repository.deactivate(id);
    if (!team) {
      throw new Error('Equipe não encontrada');
    }

    return team;
  }

  async addMember(teamId: number, memberId: number): Promise<void> {
    logger.info('Adding member to team', { teamId, memberId });

    const success = await this.repository.addMember(teamId, memberId);
    if (!success) {
      throw new Error('Erro ao adicionar membro à equipe');
    }
  }

  async removeMember(teamId: number, memberId: number): Promise<void> {
    logger.info('Removing member from team', { teamId, memberId });

    const success = await this.repository.removeMember(teamId, memberId);
    if (!success) {
      throw new Error('Erro ao remover membro da equipe');
    }
  }
}
