import { TeamMemberAllocationEntity } from '../entities/team-member-allocation.entity';
import {
  TeamMemberAllocationRepository,
  TeamMemberAllocationFilters,
} from '../repositories/team-member-allocation-repository';
import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TeamRepository } from '../repositories/team-repository';
import { TaskRepository } from '../repositories/task-repository';
import { logger } from '@main/infrastructure/log/logger';

export interface CreateTeamMemberAllocationInput {
  teamMemberId: number;
  teamId: number;
  startDate: Date;
  endDate?: Date;
  notes: string; // Campo "Motivo" — obrigatório
}

export interface UpdateTeamMemberAllocationInput {
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  isActive?: boolean;
}

export interface TeamMemberAllocation {
  id: number;
  teamMemberId: number;
  teamId: number;
  teamMemberName?: string;
  teamName?: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamCapacitySummary {
  teamId: number;
  teamName: string;
  totalMembers: number;
  members: {
    id: number;
    name: string;
    role: string;
    startDate: Date;
    endDate?: Date;
  }[];
}

export interface AllocationConflict {
  memberId: number;
  memberName: string;
  allocatedTeamId: number;
  allocatedTeamName: string;
  taskTeamId: number;
  taskTeamName: string;
  taskTitle: string;
}

export class TeamMemberAllocationService {
  private repository: TeamMemberAllocationRepository;
  private teamMemberRepository: TeamMemberRepository;
  private teamRepository: TeamRepository;
  private taskRepository: TaskRepository;

  constructor(
    repository?: TeamMemberAllocationRepository,
    teamMemberRepository?: TeamMemberRepository,
    teamRepository?: TeamRepository,
    taskRepository?: TaskRepository,
  ) {
    this.repository = repository ?? new TeamMemberAllocationRepository();
    this.teamMemberRepository =
      teamMemberRepository ?? new TeamMemberRepository();
    this.teamRepository = teamRepository ?? new TeamRepository();
    this.taskRepository = taskRepository ?? new TaskRepository();
  }

  async create(
    input: CreateTeamMemberAllocationInput,
  ): Promise<TeamMemberAllocation> {
    logger.info('Creating team member allocation', input);

    // Validate notes (campo "Motivo") is not empty
    if (!input.notes || input.notes.trim() === '') {
      throw new Error('O campo Motivo é obrigatório para a alocação.');
    }

    // Validate team member exists
    const teamMember = await this.teamMemberRepository.findOneBy({
      id: input.teamMemberId,
    });
    if (!teamMember) {
      throw new Error('Membro da equipe não encontrado');
    }

    // Validate team exists
    const team = await this.teamRepository.findById(input.teamId);
    if (!team) {
      throw new Error('Equipe não encontrada');
    }

    // Validate dates
    this.validateDates(input.startDate, input.endDate);

    // Validate cross-team uniqueness: member cannot be active in any other team
    await this.validateCrossTeamUniqueness(
      input.teamMemberId,
      input.startDate,
      input.endDate,
    );

    const entity = await this.repository.save({
      teamMemberId: input.teamMemberId,
      teamId: input.teamId,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      isActive: true,
    });

    return this.mapToDto(entity, teamMember.name, team.name);
  }

  async update(
    id: number,
    input: UpdateTeamMemberAllocationInput,
  ): Promise<TeamMemberAllocation> {
    logger.info('Updating team member allocation', { id, input });

    const entity = await this.repository.findOne({
      where: { id },
      relations: ['teamMember', 'team'],
    });

    if (!entity) {
      throw new Error('Alocação não encontrada');
    }

    if (input.startDate !== undefined) {
      entity.startDate = input.startDate;
    }

    if (input.endDate !== undefined) {
      entity.endDate = input.endDate;
    }

    if (input.notes !== undefined) {
      if (input.notes.trim() === '') {
        throw new Error('O campo Motivo é obrigatório para a alocação.');
      }
      entity.notes = input.notes;
    }

    if (input.isActive !== undefined) {
      entity.isActive = input.isActive;
    }

    // Validate dates
    this.validateDates(entity.startDate, entity.endDate);

    // Check for overlapping allocations across all teams (excluding current)
    await this.validateCrossTeamUniqueness(
      entity.teamMemberId,
      entity.startDate,
      entity.endDate,
      id,
    );

    const updated = await this.repository.save(entity);
    return this.mapToDto(updated, entity.teamMember?.name, entity.team?.name);
  }

  async delete(id: number): Promise<void> {
    logger.info('Deleting team member allocation', { id });

    const entity = await this.repository.findOneBy({ id });
    if (!entity) {
      throw new Error('Alocação não encontrada');
    }

    await this.repository.delete({ id } as any);
  }

  async deactivate(id: number): Promise<TeamMemberAllocation> {
    logger.info('Deactivating team member allocation', { id });
    return this.update(id, { isActive: false, endDate: new Date() });
  }

  async detectAllocationConflicts(
    teamMemberId?: number,
  ): Promise<AllocationConflict[]> {
    logger.info('Detecting allocation conflicts', { teamMemberId });

    // Get active allocations, optionally filtered by teamMemberId
    let activeAllocations: TeamMemberAllocationEntity[];
    if (teamMemberId !== undefined) {
      activeAllocations =
        await this.repository.findActiveByTeamMember(teamMemberId);
    } else {
      activeAllocations = await this.repository.findWithFilters({
        isActive: true,
      });
    }

    const conflicts: AllocationConflict[] = [];

    for (const allocation of activeAllocations) {
      const member =
        allocation.teamMember ??
        (await this.teamMemberRepository.findOneBy({
          id: allocation.teamMemberId,
        }));

      if (!member?.email) {
        continue;
      }

      const allocatedTeam =
        allocation.team ??
        (await this.teamRepository.findById(allocation.teamId));

      if (!allocatedTeam) {
        continue;
      }

      // Find tasks assigned to this member's email
      const tasks = await this.taskRepository.findByAssignedToEmail(
        member.email,
      );

      for (const task of tasks) {
        // Only consider tasks that have a team assigned and it differs from the allocation team
        if (task.teamId && task.teamId !== allocation.teamId) {
          const taskTeam =
            task.team ?? (await this.teamRepository.findById(task.teamId));

          conflicts.push({
            memberId: member.id,
            memberName: member.name,
            allocatedTeamId: allocation.teamId,
            allocatedTeamName: allocatedTeam.name,
            taskTeamId: task.teamId,
            taskTeamName: taskTeam?.name ?? '',
            taskTitle: task.title,
          });
        }
      }
    }

    return conflicts;
  }

  async findById(id: number): Promise<TeamMemberAllocation | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['teamMember', 'team'],
    });

    if (!entity) {
      return null;
    }

    return this.mapToDto(entity, entity.teamMember?.name, entity.team?.name);
  }

  async findByTeam(teamId: number): Promise<TeamMemberAllocation[]> {
    const entities = await this.repository.findByTeam(teamId);
    return entities.map((e) =>
      this.mapToDto(e, e.teamMember?.name, e.team?.name),
    );
  }

  async findByTeamMember(
    teamMemberId: number,
  ): Promise<TeamMemberAllocation[]> {
    const entities = await this.repository.findByTeamMember(teamMemberId);
    return entities.map((e) =>
      this.mapToDto(e, e.teamMember?.name, e.team?.name),
    );
  }

  async findActiveByTeam(
    teamId: number,
    referenceDate?: Date,
  ): Promise<TeamMemberAllocation[]> {
    const entities = await this.repository.findActiveByTeam(
      teamId,
      referenceDate,
    );
    return entities.map((e) =>
      this.mapToDto(e, e.teamMember?.name, e.team?.name),
    );
  }

  async findActiveByTeamMember(
    teamMemberId: number,
    referenceDate?: Date,
  ): Promise<TeamMemberAllocation[]> {
    const entities = await this.repository.findActiveByTeamMember(
      teamMemberId,
      referenceDate,
    );
    return entities.map((e) =>
      this.mapToDto(e, e.teamMember?.name, e.team?.name),
    );
  }

  async findAll(
    filters?: TeamMemberAllocationFilters,
  ): Promise<TeamMemberAllocation[]> {
    let entities: TeamMemberAllocationEntity[];

    if (filters) {
      entities = await this.repository.findWithFilters(filters);
    } else {
      entities = await this.repository.find({
        relations: ['teamMember', 'team'],
        order: { startDate: 'DESC' },
      });
    }

    return entities.map((e) =>
      this.mapToDto(e, e.teamMember?.name, e.team?.name),
    );
  }

  async getTeamCapacity(
    teamId: number,
    referenceDate?: Date,
  ): Promise<TeamCapacitySummary> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new Error('Equipe não encontrada');
    }

    const activeAllocations = await this.repository.findActiveByTeam(
      teamId,
      referenceDate,
    );

    const members = activeAllocations.map((a) => ({
      id: a.teamMemberId,
      name: a.teamMember?.name ?? '',
      role: a.teamMember?.role ?? '',
      startDate: a.startDate,
      endDate: a.endDate,
    }));

    return {
      teamId,
      teamName: team.name,
      totalMembers: members.length,
      members,
    };
  }

  async getMemberAvailability(
    teamMemberId: number,
    referenceDate?: Date,
  ): Promise<number> {
    const activeAllocations = await this.repository.findActiveByTeamMember(
      teamMemberId,
      referenceDate,
    );
    // With dynamic allocation (no dedication percentage), member is either available (100) or not (0)
    return activeAllocations.length > 0 ? 0 : 100;
  }

  private async validateCrossTeamUniqueness(
    teamMemberId: number,
    startDate: Date,
    endDate?: Date,
    excludeAllocationId?: number,
  ): Promise<void> {
    const overlapping = await this.repository.findOverlappingCrossTeam(
      teamMemberId,
      startDate,
      endDate,
      excludeAllocationId,
    );

    if (overlapping.length > 0) {
      const teamName = overlapping[0].team?.name ?? 'desconhecida';
      throw new Error(
        `Membro já está alocado na equipe ${teamName}. Finalize a alocação atual antes de criar uma nova.`,
      );
    }
  }

  private validateDates(startDate: Date, endDate?: Date): void {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      if (end < start) {
        throw new Error('Data fim deve ser posterior ou igual à data início');
      }
    }
  }

  private mapToDto(
    entity: TeamMemberAllocationEntity,
    teamMemberName?: string,
    teamName?: string,
  ): TeamMemberAllocation {
    return {
      id: entity.id,
      teamMemberId: entity.teamMemberId,
      teamId: entity.teamId,
      teamMemberName,
      teamName,
      startDate: entity.startDate,
      endDate: entity.endDate,
      notes: entity.notes,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
