import { TeamMemberAllocationEntity } from '../entities/team-member-allocation.entity';
import {
  TeamMemberAllocationRepository,
  TeamMemberAllocationFilters,
} from '../repositories/team-member-allocation-repository';
import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TeamRepository } from '../repositories/team-repository';
import { logger } from '@main/infrastructure/log/logger';

export interface CreateTeamMemberAllocationInput {
  teamMemberId: number;
  teamId: number;
  startDate: Date;
  endDate?: Date;
  dedicationPercentage?: number;
  notes?: string;
}

export interface UpdateTeamMemberAllocationInput {
  startDate?: Date;
  endDate?: Date;
  dedicationPercentage?: number;
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
  dedicationPercentage: number;
  notes?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamCapacitySummary {
  teamId: number;
  teamName: string;
  totalMembers: number;
  totalDedication: number;
  members: {
    id: number;
    name: string;
    role: string;
    dedicationPercentage: number;
    startDate: Date;
    endDate?: Date;
  }[];
}

export class TeamMemberAllocationService {
  private repository: TeamMemberAllocationRepository;
  private teamMemberRepository: TeamMemberRepository;
  private teamRepository: TeamRepository;

  constructor(
    repository?: TeamMemberAllocationRepository,
    teamMemberRepository?: TeamMemberRepository,
    teamRepository?: TeamRepository,
  ) {
    this.repository = repository ?? new TeamMemberAllocationRepository();
    this.teamMemberRepository =
      teamMemberRepository ?? new TeamMemberRepository();
    this.teamRepository = teamRepository ?? new TeamRepository();
  }

  async create(
    input: CreateTeamMemberAllocationInput,
  ): Promise<TeamMemberAllocation> {
    logger.info('Creating team member allocation', input);

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

    // Validate dedication percentage
    const dedicationPercentage = input.dedicationPercentage ?? 100;
    if (dedicationPercentage < 1 || dedicationPercentage > 100) {
      throw new Error('Percentual de dedicação deve estar entre 1 e 100');
    }

    // Check for overlapping allocations in the same team
    const overlapping = await this.repository.findOverlapping(
      input.teamMemberId,
      input.teamId,
      input.startDate,
      input.endDate,
    );
    if (overlapping.length > 0) {
      throw new Error(
        'Já existe uma alocação ativa para este membro nesta equipe no período informado',
      );
    }

    // Check total dedication doesn't exceed 100%
    const currentDedication = await this.repository.getTotalDedication(
      input.teamMemberId,
      input.startDate,
    );
    if (currentDedication + dedicationPercentage > 100) {
      throw new Error(
        `Dedicação total excede 100%. Dedicação atual: ${currentDedication}%, disponível: ${100 - currentDedication}%`,
      );
    }

    const entity = await this.repository.save({
      teamMemberId: input.teamMemberId,
      teamId: input.teamId,
      startDate: input.startDate,
      endDate: input.endDate,
      dedicationPercentage,
      notes: input.notes,
      isActive: true,
    });

    // Also add to the ManyToMany relationship for backward compatibility
    await this.teamRepository.addMember(input.teamId, input.teamMemberId);

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

    if (input.dedicationPercentage !== undefined) {
      if (input.dedicationPercentage < 1 || input.dedicationPercentage > 100) {
        throw new Error('Percentual de dedicação deve estar entre 1 e 100');
      }
      entity.dedicationPercentage = input.dedicationPercentage;
    }

    if (input.notes !== undefined) {
      entity.notes = input.notes;
    }

    if (input.isActive !== undefined) {
      entity.isActive = input.isActive;
    }

    // Validate dates
    this.validateDates(entity.startDate, entity.endDate);

    // Check for overlapping allocations (excluding current)
    const overlapping = await this.repository.findOverlapping(
      entity.teamMemberId,
      entity.teamId,
      entity.startDate,
      entity.endDate,
      id,
    );
    if (overlapping.length > 0) {
      throw new Error(
        'Já existe uma alocação ativa para este membro nesta equipe no período informado',
      );
    }

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
      dedicationPercentage: a.dedicationPercentage,
      startDate: a.startDate,
      endDate: a.endDate,
    }));

    const totalDedication = members.reduce(
      (sum, m) => sum + m.dedicationPercentage,
      0,
    );

    return {
      teamId,
      teamName: team.name,
      totalMembers: members.length,
      totalDedication,
      members,
    };
  }

  async getMemberAvailability(
    teamMemberId: number,
    referenceDate?: Date,
  ): Promise<number> {
    const totalDedication = await this.repository.getTotalDedication(
      teamMemberId,
      referenceDate,
    );
    return Math.max(0, 100 - totalDedication);
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
      dedicationPercentage: entity.dedicationPercentage,
      notes: entity.notes,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
