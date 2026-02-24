import { TaskStatusConfigRepository } from '../repositories/task-status-config-repository';
import { logger } from '@main/infrastructure/log/logger';

export interface TaskStatusConfig {
  id: number;
  name: string;
  label: string;
  color: string;
  order: number;
  showInKanban: boolean;
  isDefault: boolean;
}

export interface CreateTaskStatusConfigInput {
  name: string;
  label: string;
  color?: string;
  order?: number;
  showInKanban?: boolean;
}

export interface UpdateTaskStatusConfigInput {
  label?: string;
  color?: string;
  order?: number;
  showInKanban?: boolean;
}

export class TaskStatusConfigService {
  private repository: TaskStatusConfigRepository;

  constructor() {
    this.repository = new TaskStatusConfigRepository();
  }

  async findAll(): Promise<TaskStatusConfig[]> {
    const entities = await this.repository.findAll();
    return entities.map(this.toDto);
  }

  async findKanbanStatuses(): Promise<TaskStatusConfig[]> {
    const entities = await this.repository.findKanbanStatuses();
    return entities.map(this.toDto);
  }

  async create(input: CreateTaskStatusConfigInput): Promise<TaskStatusConfig> {
    logger.info('Creating task status config', { name: input.name });

    const existing = await this.repository.findByName(input.name);
    if (existing) {
      throw new Error(`Status com nome "${input.name}" já existe`);
    }

    const order = input.order ?? (await this.repository.getMaxOrder()) + 1;

    const entity = await this.repository.create({
      name: input.name,
      label: input.label,
      color: input.color ?? '#9e9e9e',
      order,
      showInKanban: input.showInKanban ?? true,
      isDefault: false,
    });

    return this.toDto(entity);
  }

  async update(
    id: number,
    input: UpdateTaskStatusConfigInput,
  ): Promise<TaskStatusConfig> {
    logger.info('Updating task status config', { id });

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Status não encontrado');
    }

    const updated = await this.repository.updateById(id, input);
    if (!updated) {
      throw new Error('Erro ao atualizar status');
    }

    return this.toDto(updated);
  }

  async delete(id: number): Promise<void> {
    logger.info('Deleting task status config', { id });

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Status não encontrado');
    }

    if (existing.isDefault) {
      throw new Error('Não é possível excluir um status padrão');
    }

    await this.repository.deleteById(id);
  }

  private toDto(entity: any): TaskStatusConfig {
    return {
      id: entity.id,
      name: entity.name,
      label: entity.label,
      color: entity.color,
      order: entity.order,
      showInKanban: entity.showInKanban,
      isDefault: entity.isDefault,
    };
  }
}
