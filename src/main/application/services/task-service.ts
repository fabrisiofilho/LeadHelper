import {
  TaskEntity,
  TaskStatus,
  TaskOrigin,
  TaskPriority,
  TaskType,
  EstimationType,
} from '../entities/task.entity';
import { TaskRepository } from '../repositories/task-repository';

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
  estimationPoints?: number;
  estimationHours?: number;
  estimationType?: EstimationType;
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
  estimationPoints?: number;
  estimationHours?: number;
  estimationType?: EstimationType;
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
  externalSource?: string;
  sprintId?: number;
  sprint?: { id: number; name: string };
  teamId?: number;
  team?: { id: number; name: string };
  assignee?: { id: number; name: string };
  estimationPoints?: number;
  estimationHours?: number;
  estimationType?: EstimationType;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaskService {
  private repository: TaskRepository;

  constructor(repository?: TaskRepository) {
    this.repository = repository ?? new TaskRepository();
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const trimmedTitle = input.title?.trim();

    if (!trimmedTitle) {
      throw new Error('Título é obrigatório');
    }

    if (input.startDate && input.endDate) {
      this.validateDates(input.startDate, input.endDate);
    }

    const entity = await this.repository.save({
      title: trimmedTitle,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? 'pending',
      priority: input.priority ?? 'medium',
      type: input.type ?? 'task',
      origin: 'manual',
      sprintId: input.sprintId,
      teamId: input.teamId,
      estimationPoints: input.estimationPoints,
      estimationHours: input.estimationHours,
      estimationType: input.estimationType,
    });

    const reloaded = await this.repository.findOne({
      where: { id: entity.id },
      relations: ['sprint', 'team', 'allocations', 'allocations.teamMember'],
    });

    return this.mapToDto(reloaded ?? entity);
  }

  async update(id: number, input: UpdateTaskInput): Promise<Task> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Tarefa não encontrada');
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
    if (input.estimationPoints !== undefined)
      entity.estimationPoints = input.estimationPoints;
    if (input.estimationHours !== undefined)
      entity.estimationHours = input.estimationHours;
    if (input.estimationType !== undefined)
      entity.estimationType = input.estimationType;

    const updated = await this.repository.save(entity);

    const reloaded = await this.repository.findOne({
      where: { id: updated.id },
      relations: ['sprint', 'team', 'allocations', 'allocations.teamMember'],
    });

    return this.mapToDto(reloaded ?? updated);
  }

  async findById(id: number): Promise<Task | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['sprint', 'team', 'allocations', 'allocations.teamMember'],
    });

    if (!entity) return null;
    return this.mapToDto(entity);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new Error('Tarefa não encontrada');

    const hasAllocations = await this.repository.hasAllocations(id);
    if (hasAllocations) {
      throw new Error('Não é possível excluir tarefa com alocações vinculadas');
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
    // Derive assignee from the first allocation (if any)
    const firstAllocation = entity.allocations?.[0];
    const assignee = firstAllocation?.teamMember
      ? {
          id: firstAllocation.teamMember.id,
          name: firstAllocation.teamMember.name,
        }
      : undefined;

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
      externalSource: entity.externalSource,
      sprintId: entity.sprintId,
      sprint: entity.sprint
        ? { id: entity.sprint.id, name: entity.sprint.name }
        : undefined,
      teamId: entity.teamId,
      team: entity.team
        ? { id: entity.team.id, name: entity.team.name }
        : undefined,
      assignee,
      estimationPoints: entity.estimationPoints,
      estimationHours: entity.estimationHours,
      estimationType: entity.estimationType,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
