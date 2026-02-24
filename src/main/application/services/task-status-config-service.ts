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

  private async ensureDefaults(): Promise<void> {
    const count = await this.repository.count();
    if (count > 0) return;

    logger.info('No task statuses found, seeding defaults...');

    const defaults = [
      {
        name: 'backlog',
        label: 'Backlog',
        color: '#78909c',
        order: 0,
        showInKanban: true,
        isDefault: true,
      },
      {
        name: 'to_do',
        label: 'A Fazer',
        color: '#5c6bc0',
        order: 1,
        showInKanban: true,
        isDefault: false,
      },
      {
        name: 'in_progress',
        label: 'Em Andamento',
        color: '#1976d2',
        order: 2,
        showInKanban: true,
        isDefault: false,
      },
      {
        name: 'code_review',
        label: 'Code Review',
        color: '#7b1fa2',
        order: 3,
        showInKanban: true,
        isDefault: false,
      },
      {
        name: 'testing',
        label: 'Em Teste',
        color: '#f57c00',
        order: 4,
        showInKanban: true,
        isDefault: false,
      },
      {
        name: 'done',
        label: 'Concluído',
        color: '#2e7d32',
        order: 5,
        showInKanban: true,
        isDefault: false,
      },
      {
        name: 'blocked',
        label: 'Bloqueado',
        color: '#d32f2f',
        order: 6,
        showInKanban: false,
        isDefault: false,
      },
      {
        name: 'cancelled',
        label: 'Cancelado',
        color: '#616161',
        order: 7,
        showInKanban: false,
        isDefault: false,
      },
    ];

    for (const status of defaults) {
      try {
        await this.repository.create(status);
      } catch (err) {
        logger.warning(`Failed to seed status ${status.name}:`, err);
      }
    }

    logger.success('Default task statuses seeded');
  }

  async findAll(): Promise<TaskStatusConfig[]> {
    await this.ensureDefaults();
    const entities = await this.repository.findAll();
    return entities.map(this.toDto);
  }

  async findKanbanStatuses(): Promise<TaskStatusConfig[]> {
    await this.ensureDefaults();
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
      showInKanban: Boolean(entity.showInKanban),
      isDefault: Boolean(entity.isDefault),
    };
  }
}
