import {
  TeamMemberEntity,
  TeamMemberRole,
} from '../entities/team-member.entity';
import {
  TeamMemberRepository,
  TeamMemberFilters,
} from '../repositories/team-member-repository';

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  role: TeamMemberRole;
  positionId?: number;
}

export interface UpdateTeamMemberInput {
  name?: string;
  email?: string;
  role?: TeamMemberRole;
  positionId?: number;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: TeamMemberRole;
  isActive: boolean;
  positionId?: number;
  position?: { id: number; name: string; description?: string };
  teams?: { id: number; name: string; isActive: boolean }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class TeamMemberService {
  private repository: TeamMemberRepository;

  constructor(repository?: TeamMemberRepository) {
    this.repository = repository ?? new TeamMemberRepository();
  }

  async create(input: CreateTeamMemberInput): Promise<TeamMember> {
    const trimmedName = input.name?.trim();

    if (!trimmedName) {
      throw new Error('Nome é obrigatório');
    }

    const existingMember = await this.repository.findByEmail(input.email);
    if (existingMember) {
      throw new Error('Email já cadastrado');
    }

    const entity = await this.repository.save({
      name: trimmedName,
      email: input.email,
      role: input.role,
      positionId: input.positionId,
      isActive: true,
    });

    return this.mapToDto(entity);
  }

  async update(id: number, input: UpdateTeamMemberInput): Promise<TeamMember> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Membro da equipe não encontrado');
    }

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error('Nome é obrigatório');
      }
      entity.name = trimmedName;
    }

    if (input.email !== undefined && input.email !== entity.email) {
      const existingMember = await this.repository.findByEmail(input.email);
      if (existingMember && existingMember.id !== id) {
        throw new Error('Email já cadastrado');
      }
      entity.email = input.email;
    }

    if (input.role !== undefined) {
      entity.role = input.role;
    }

    if (input.positionId !== undefined) {
      entity.positionId = input.positionId;
    }

    const updated = await this.repository.save(entity);
    return this.mapToDto(updated);
  }

  async findById(id: number): Promise<TeamMember | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }

    return this.mapToDto(entity);
  }

  async deactivate(id: number): Promise<void> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Membro da equipe não encontrado');
    }

    entity.isActive = false;
    await this.repository.save(entity);
  }

  async activate(id: number): Promise<void> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      throw new Error('Membro da equipe não encontrado');
    }

    entity.isActive = true;
    await this.repository.save(entity);
  }

  async findByRole(role: TeamMemberRole): Promise<TeamMember[]> {
    const entities = await this.repository.findByRole(role);
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findAll(filters?: TeamMemberFilters): Promise<TeamMember[]> {
    let entities: TeamMemberEntity[];

    if (
      filters &&
      (filters.role !== undefined || filters.isActive !== undefined)
    ) {
      entities = await this.repository.findWithFilters(filters);
    } else {
      entities = await this.repository.find();
    }

    return entities.map((entity) => this.mapToDto(entity));
  }

  private mapToDto(entity: TeamMemberEntity): TeamMember {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
      isActive: entity.isActive,
      positionId: entity.positionId,
      position: entity.position
        ? {
            id: entity.position.id,
            name: entity.position.name,
            description: entity.position.description,
          }
        : undefined,
      teams: entity.teams?.map((t) => ({
        id: t.id,
        name: t.name,
        isActive: t.isActive,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
