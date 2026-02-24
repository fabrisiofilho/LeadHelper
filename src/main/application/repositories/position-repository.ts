import { Repository } from 'typeorm';
import { PositionEntity } from '../entities/position.entity';
import { getDataSource } from '@main/infrastructure/database/data-source';

export class PositionRepository {
  private _repository: Repository<PositionEntity> | null = null;

  private get repository(): Repository<PositionEntity> {
    if (!this._repository) {
      this._repository = getDataSource().getRepository(PositionEntity);
    }
    return this._repository;
  }

  async create(data: Partial<PositionEntity>): Promise<PositionEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: number,
    data: Partial<PositionEntity>,
  ): Promise<PositionEntity | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findById(id: number): Promise<PositionEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<PositionEntity | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(filters?: { isActive?: boolean }): Promise<PositionEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    return this.repository.find({ where, order: { name: 'ASC' } });
  }

  async activate(id: number): Promise<PositionEntity | null> {
    await this.repository.update(id, { isActive: true });
    return this.findById(id);
  }

  async deactivate(id: number): Promise<PositionEntity | null> {
    await this.repository.update(id, { isActive: false });
    return this.findById(id);
  }
}
