import {
  TaskEntity,
  TaskStatus,
  TaskOrigin,
  TaskPriority,
  TaskType,
} from '../entities/task.entity';
import { TaskRepository } from '../repositories/task-repository';
import { logger } from '@main/infrastructure/log/logger';

export interface CreateTaskInput {
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  sprintId?: number;
  teamId?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  sprintId?: number;
  teamId?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  startDate?: Date;
  endDate?: Date;
  origin?: TaskOrigin;
  sprintId?: number;
  teamId?: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  origin: TaskOrigin;
  externalId?: string;
  sprintId?: number;
  sprint?: { id: number; name: string };
  teamId?: number;
  team?: { id: number; name: string };
  assignedToName?: string;
  assignedToEmail?: string;
  parentId?: number;
  parent?: Task;
  children?: Task[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaskService {
  private repository: TaskRepository;

  constructor(repository?: TaskRepository) {
    this.repository = repository ?? new TaskRepository();
  }

  async create(_input: CreateTaskInput): Promise<Task> {
    throw new Error(
      'Criação manual de tarefas não é permitida. Todas as tarefas são gerenciadas no Azure DevOps.',
    );
  }

  async update(id: number, input: UpdateTaskInput): Promise<Task> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Tarefa não encontrada');
    }

    if (entity.origin === 'azure_devops') {
      throw new Error(
        'Esta tarefa é gerenciada no Azure DevOps e não pode ser editada localmente.',
      );
    }

    if (input.title !== undefined) {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new Error('Título é obrigatório');
      }
      entity.title = trimmedTitle;
    }

    if (input.description !== undefined) entity.description = input.description;
    if (input.startDate !== undefined) entity.startDate = input.startDate;
    if (input.endDate !== undefined) entity.endDate = input.endDate;

    if (entity.startDate && entity.endDate) {
      this.validateDates(entity.startDate, entity.endDate);
    }

    if (input.status !== undefined) entity.status = input.status;
    if (input.priority !== undefined) entity.priority = input.priority;
    if (input.type !== undefined) entity.type = input.type;
    if (input.sprintId !== undefined) entity.sprintId = input.sprintId;
    if (input.teamId !== undefined) entity.teamId = input.teamId;

    const updated = await this.repository.save(entity);

    const reloaded = await this.repository.findOne({
      where: { id: updated.id },
      relations: ['sprint', 'team'],
    });

    return this.mapToDto(reloaded ?? updated);
  }

  async findById(id: number): Promise<Task | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['sprint', 'team', 'parent', 'children'],
    });

    if (!entity) return null;

    logger.info('[TaskService.findById] Task loaded:', {
      id: entity.id,
      title: entity.title,
      hasParent: !!entity.parent,
      parentId: entity.parentId,
      hasChildren: !!entity.children && entity.children.length > 0,
      childrenCount: entity.children?.length || 0,
    });

    return this.mapToDto(entity);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new Error('Tarefa não encontrada');

    if (entity.origin === 'azure_devops') {
      throw new Error(
        'Esta tarefa é gerenciada no Azure DevOps e não pode ser editada localmente.',
      );
    }

    await this.repository.delete({ id } as any);
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    const entities = await this.repository.findByStatus(status);
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<Task[]> {
    const entities = await this.repository.findByPeriod(startDate, endDate);
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findBySprint(sprintId: number): Promise<Task[]> {
    const entities = await this.repository.findBySprint(sprintId);
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    let entities: TaskEntity[];

    if (
      filters &&
      (filters.status ||
        filters.startDate ||
        filters.endDate ||
        filters.origin ||
        filters.sprintId ||
        filters.teamId)
    ) {
      entities = await this.findWithFilters(filters);
    } else {
      entities = await this.repository.findAllWithRelations();
    }

    return entities.map((entity) => this.mapToDto(entity));
  }

  private async findWithFilters(filters: TaskFilters): Promise<TaskEntity[]> {
    if (filters.startDate && filters.endDate) {
      let entities = await this.repository.findByPeriod(
        filters.startDate,
        filters.endDate,
      );
      if (filters.status)
        entities = entities.filter((e) => e.status === filters.status);
      if (filters.origin)
        entities = entities.filter((e) => e.origin === filters.origin);
      if (filters.sprintId)
        entities = entities.filter((e) => e.sprintId === filters.sprintId);
      if (filters.teamId)
        entities = entities.filter((e) => e.teamId === filters.teamId);
      return entities;
    }

    if (filters.status) {
      let entities = await this.repository.findByStatus(filters.status);
      if (filters.origin)
        entities = entities.filter((e) => e.origin === filters.origin);
      if (filters.sprintId)
        entities = entities.filter((e) => e.sprintId === filters.sprintId);
      if (filters.teamId)
        entities = entities.filter((e) => e.teamId === filters.teamId);
      return entities;
    }

    if (filters.sprintId)
      return await this.repository.findBySprint(filters.sprintId);
    if (filters.origin)
      return await this.repository.findByOrigin(filters.origin);
    return await this.repository.find();
  }

  private validateDates(startDate: Date, endDate: Date): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < start) {
      throw new Error('Data fim deve ser posterior ou igual à data início');
    }
  }

  private mapToDto(entity: TaskEntity): Task {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      priority: entity.priority,
      type: entity.type ?? 'task',
      origin: entity.origin,
      externalId: entity.externalId,
      sprintId: entity.sprintId,
      sprint: entity.sprint
        ? { id: entity.sprint.id, name: entity.sprint.name }
        : undefined,
      teamId: entity.teamId,
      team: entity.team
        ? { id: entity.team.id, name: entity.team.name }
        : undefined,
      assignedToName: entity.assignedToName,
      assignedToEmail: entity.assignedToEmail,
      azureCreatedDate: entity.azureCreatedDate,
      azureChangedDate: entity.azureChangedDate,
      parentId: entity.parentId,
      parent: entity.parent ? this.mapToDto(entity.parent) : undefined,
      children: entity.children
        ? entity.children.map((child) => this.mapToDto(child))
        : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
