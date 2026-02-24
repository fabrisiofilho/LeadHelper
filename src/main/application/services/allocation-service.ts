import { AllocationEntity } from '../entities/allocation.entity';
import { AllocationRepository } from '../repositories/allocation-repository';
import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';

export interface CreateAllocationInput {
  teamMemberId: number;
  taskId: number;
  startDate: Date;
  endDate: Date;
}

export interface UpdateAllocationInput {
  startDate?: Date;
  endDate?: Date;
}

export interface Allocation {
  id: number;
  teamMemberId: number;
  taskId: number;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AllocationService {
  private repository: AllocationRepository;
  private teamMemberRepository: TeamMemberRepository;
  private taskRepository: TaskRepository;

  constructor(
    repository?: AllocationRepository,
    teamMemberRepository?: TeamMemberRepository,
    taskRepository?: TaskRepository,
  ) {
    this.repository = repository ?? new AllocationRepository();
    this.teamMemberRepository =
      teamMemberRepository ?? new TeamMemberRepository();
    this.taskRepository = taskRepository ?? new TaskRepository();
  }

  async create(input: CreateAllocationInput): Promise<Allocation> {
    // Validate referential integrity - team member must exist
    const teamMember = await this.teamMemberRepository.findOneBy({
      id: input.teamMemberId,
    });
    if (!teamMember) {
      throw new Error('Membro da equipe não encontrado');
    }

    // Validate referential integrity - task must exist
    const task = await this.taskRepository.findOneBy({ id: input.taskId });
    if (!task) {
      throw new Error('Tarefa não encontrada');
    }

    // Validate dates
    this.validateDates(input.startDate, input.endDate);

    const entity = await this.repository.save({
      teamMemberId: input.teamMemberId,
      taskId: input.taskId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return this.mapToDto(entity);
  }

  async update(id: number, input: UpdateAllocationInput): Promise<Allocation> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Alocação não encontrada');
    }

    if (input.startDate !== undefined) {
      entity.startDate = input.startDate;
    }

    if (input.endDate !== undefined) {
      entity.endDate = input.endDate;
    }

    // Validate dates after potential updates
    this.validateDates(entity.startDate, entity.endDate);

    const updated = await this.repository.save(entity);
    return this.mapToDto(updated);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Alocação não encontrada');
    }

    await this.repository.delete({ id } as any);
  }

  async findById(id: number): Promise<Allocation | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }

    return this.mapToDto(entity);
  }

  async findByTeamMember(teamMemberId: number): Promise<Allocation[]> {
    const entities = await this.repository.findByTeamMember(teamMemberId);
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findByTask(taskId: number): Promise<Allocation[]> {
    const entities = await this.repository.findByTask(taskId);
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<Allocation[]> {
    const entities = await this.repository.findByPeriod(startDate, endDate);
    return entities.map((entity) => this.mapToDto(entity));
  }

  private validateDates(startDate: Date, endDate: Date): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Normalize to compare only dates (ignore time)
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      throw new Error('Data fim deve ser posterior ou igual à data início');
    }
  }

  private mapToDto(entity: AllocationEntity): Allocation {
    return {
      id: entity.id,
      teamMemberId: entity.teamMemberId,
      taskId: entity.taskId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
