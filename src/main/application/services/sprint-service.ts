import {
  SprintRepository,
  SprintFilters,
} from '../repositories/sprint-repository';
import { SprintEntity } from '../entities/sprint.entity';
import { logger } from '@main/infrastructure/log/logger';

export interface CreateSprintInput {
  name: string;
  startDate: Date;
  endDate: Date;
  teamId?: number;
  description?: string;
}

export interface UpdateSprintInput {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  teamId?: number;
  description?: string;
}

export class SprintService {
  private repository: SprintRepository;

  constructor() {
    this.repository = new SprintRepository();
  }

  async create(data: CreateSprintInput): Promise<SprintEntity> {
    logger.info('Creating sprint', { name: data.name });

    if (data.startDate > data.endDate) {
      throw new Error('Data de início deve ser anterior à data de fim');
    }

    return this.repository.create({
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      teamId: data.teamId,
      description: data.description,
      isActive: true,
    });
  }

  async update(id: number, data: UpdateSprintInput): Promise<SprintEntity> {
    logger.info('Updating sprint', { id, data });

    const sprint = await this.repository.findById(id);
    if (!sprint) {
      throw new Error('Sprint não encontrada');
    }

    const startDate = data.startDate ?? sprint.startDate;
    const endDate = data.endDate ?? sprint.endDate;

    if (startDate > endDate) {
      throw new Error('Data de início deve ser anterior à data de fim');
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error('Erro ao atualizar sprint');
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    logger.info('Deleting sprint', { id });

    const sprint = await this.repository.findById(id);
    if (!sprint) {
      throw new Error('Sprint não encontrada');
    }

    // Check if sprint has tasks
    if (sprint.tasks && sprint.tasks.length > 0) {
      throw new Error('Não é possível excluir sprint com tarefas vinculadas');
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Erro ao excluir sprint');
    }
  }

  async findById(id: number): Promise<SprintEntity | null> {
    return this.repository.findById(id);
  }

  async findAll(filters?: SprintFilters): Promise<SprintEntity[]> {
    return this.repository.findAll(filters);
  }

  async findByTeam(teamId: number): Promise<SprintEntity[]> {
    return this.repository.findByTeam(teamId);
  }

  async findCurrentSprint(teamId?: number): Promise<SprintEntity | null> {
    return this.repository.findCurrentSprint(teamId);
  }

  async findUpcomingSprints(
    teamId?: number,
    limit?: number,
  ): Promise<SprintEntity[]> {
    return this.repository.findUpcomingSprints(teamId, limit);
  }

  async activate(id: number): Promise<SprintEntity> {
    logger.info('Activating sprint', { id });

    const sprint = await this.repository.activate(id);
    if (!sprint) {
      throw new Error('Sprint não encontrada');
    }

    return sprint;
  }

  async deactivate(id: number): Promise<SprintEntity> {
    logger.info('Deactivating sprint', { id });

    const sprint = await this.repository.deactivate(id);
    if (!sprint) {
      throw new Error('Sprint não encontrada');
    }

    return sprint;
  }
}
