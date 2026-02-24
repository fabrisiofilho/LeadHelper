import { BaseRepository } from './base-repository';
import { TaskStatusConfigEntity } from '../entities/task-status-config.entity';

export class TaskStatusConfigRepository extends BaseRepository<TaskStatusConfigEntity> {
  constructor() {
    super(TaskStatusConfigEntity);
  }

  async findAll(): Promise<TaskStatusConfigEntity[]> {
    return this.repository.find({ order: { order: 'ASC' } });
  }

  async findById(id: number): Promise<TaskStatusConfigEntity | null> {
    return this.repository.findOneBy({ id });
  }

  async findByName(name: string): Promise<TaskStatusConfigEntity | null> {
    return this.repository.findOneBy({ name });
  }

  async findKanbanStatuses(): Promise<TaskStatusConfigEntity[]> {
    return this.repository.find({
      where: { showInKanban: true },
      order: { order: 'ASC' },
    });
  }

  async create(
    data: Partial<TaskStatusConfigEntity>,
  ): Promise<TaskStatusConfigEntity> {
    return this.save(data);
  }

  async updateById(
    id: number,
    data: Partial<TaskStatusConfigEntity>,
  ): Promise<TaskStatusConfigEntity | null> {
    await this.update({ id }, data as any);
    return this.findById(id);
  }

  async deleteById(id: number): Promise<void> {
    await this.delete({ id });
  }

  async getMaxOrder(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('tsc')
      .select('MAX(tsc.order)', 'maxOrder')
      .getRawOne();
    return result?.maxOrder ?? -1;
  }
}
