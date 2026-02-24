import { PositionRepository } from '../repositories/position-repository';
import { PositionEntity } from '../entities/position.entity';
import { logger } from '@main/infrastructure/log/logger';

export interface CreatePositionInput {
  name: string;
  description?: string;
}

export interface UpdatePositionInput {
  name?: string;
  description?: string;
}

export interface PositionFilters {
  isActive?: boolean;
}

export class PositionService {
  private repository: PositionRepository;

  constructor() {
    this.repository = new PositionRepository();
  }

  async create(data: CreatePositionInput): Promise<PositionEntity> {
    logger.info('Creating position', { name: data.name });

    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error(`Cargo com nome "${data.name}" já existe`);
    }

    return this.repository.create({
      name: data.name,
      description: data.description,
      isActive: true,
    });
  }

  async update(id: number, data: UpdatePositionInput): Promise<PositionEntity> {
    logger.info('Updating position', { id, data });

    const position = await this.repository.findById(id);
    if (!position) {
      throw new Error('Cargo não encontrado');
    }

    if (data.name && data.name !== position.name) {
      const existing = await this.repository.findByName(data.name);
      if (existing) {
        throw new Error(`Cargo com nome "${data.name}" já existe`);
      }
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error('Erro ao atualizar cargo');
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    logger.info('Deleting position', { id });

    const position = await this.repository.findById(id);
    if (!position) {
      throw new Error('Cargo não encontrado');
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Erro ao excluir cargo');
    }
  }

  async findById(id: number): Promise<PositionEntity | null> {
    return this.repository.findById(id);
  }

  async findAll(filters?: PositionFilters): Promise<PositionEntity[]> {
    return this.repository.findAll(filters);
  }

  async activate(id: number): Promise<PositionEntity> {
    logger.info('Activating position', { id });

    const position = await this.repository.activate(id);
    if (!position) {
      throw new Error('Cargo não encontrado');
    }

    return position;
  }

  async deactivate(id: number): Promise<PositionEntity> {
    logger.info('Deactivating position', { id });

    const position = await this.repository.deactivate(id);
    if (!position) {
      throw new Error('Cargo não encontrado');
    }

    return position;
  }
}
