import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger before any imports
vi.mock('@main/infrastructure/log/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the repository modules to avoid TypeORM initialization
vi.mock('../../repositories/team-member-repository', () => ({
  TeamMemberRepository: vi.fn(),
}));
vi.mock('../../repositories/task-repository', () => ({
  TaskRepository: vi.fn(),
}));
vi.mock('../../repositories/sprint-repository', () => ({
  SprintRepository: vi.fn(),
}));
vi.mock('../../repositories/team-repository', () => ({
  TeamRepository: vi.fn(),
}));
vi.mock('../../repositories/team-member-allocation-repository', () => ({
  TeamMemberAllocationRepository: vi.fn(),
}));
vi.mock('../../repositories/task-local-priority-repository', () => ({
  TaskLocalPriorityRepository: vi.fn(),
}));
vi.mock('../../repositories/task-sla-exclusion-repository', () => ({
  TaskSlaExclusionRepository: vi.fn(),
}));
vi.mock('../../repositories/task-hidden-repository', () => ({
  TaskHiddenRepository: vi.fn(),
}));
vi.mock('../team-member-allocation-service', () => ({
  TeamMemberAllocationService: vi.fn(),
}));

// Mock business-hours to avoid date complexity in unit tests
vi.mock('@main/infrastructure/utils/business-hours', () => ({
  calculateBusinessHours: vi.fn().mockReturnValue(5),
  addBusinessHours: vi.fn().mockImplementation((start: Date, hours: number) => {
    return new Date(start.getTime() + hours * 3600000);
  }),
}));

import { DashboardService } from '../dashboard-service';
import { TaskEntity } from '../../entities/task.entity';
import { TeamMemberEntity } from '../../entities/team-member.entity';

function createMockTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 1,
    title: 'Test Task',
    status: 'in_progress',
    priority: 'medium',
    type: 'Ticket',
    origin: 'azure_devops',
    areaPath: 'Tribo SEIF\\Sustentação\\Team1',
    assignedToEmail: 'john@example.com',
    assignedToName: 'John Doe',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    ...overrides,
  } as TaskEntity;
}

describe('DashboardService - getSustentacaoMembersWithCards', () => {
  let service: DashboardService;
  let mockTeamMemberRepository: {
    findByEmail: ReturnType<typeof vi.fn>;
  };
  let mockTaskRepository: {
    findAllWithRelations: ReturnType<typeof vi.fn>;
    findByParentId: ReturnType<typeof vi.fn>;
    findOpenByAreaAndTypes: ReturnType<typeof vi.fn>;
  };
  let mockTaskLocalPriorityRepository: {
    findByExternalIds: ReturnType<typeof vi.fn>;
  };
  let mockSlaExclusionRepository: {
    findByExternalIds: ReturnType<typeof vi.fn>;
  };
  let mockHiddenRepository: {
    findByExternalIds: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTeamMemberRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
    };
    mockTaskRepository = {
      findAllWithRelations: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn().mockResolvedValue([]),
      findOpenByAreaAndTypes: vi.fn().mockResolvedValue([]),
    };
    mockTaskLocalPriorityRepository = {
      findByExternalIds: vi.fn().mockResolvedValue(new Map()),
    };
    mockSlaExclusionRepository = {
      findByExternalIds: vi.fn().mockResolvedValue(new Set()),
    };
    mockHiddenRepository = {
      findByExternalIds: vi.fn().mockResolvedValue(new Set()),
    };

    service = new DashboardService(
      mockTeamMemberRepository as any,
      mockTaskRepository as any,
      undefined, // sprintRepository
      undefined, // teamRepository
      undefined, // allocationRepository
      undefined, // allocationService
      mockTaskLocalPriorityRepository as any,
      undefined, // taskUpdateRepository
      mockSlaExclusionRepository as any,
      mockHiddenRepository as any,
    );
  });

  it('should return empty array when no Sustentação tasks exist', async () => {
    // DB query returns no results when no matching tasks exist
    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toEqual([]);
  });

  it('should group cards by assignedTo without needing allocations', async () => {
    const task = createMockTask({
      externalId: 'WI-100',
      assignedToEmail: 'john@example.com',
      assignedToName: 'John Doe',
    });

    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([task]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(1);
    expect(result[0].member.name).toBe('John Doe');
    expect(result[0].inProgressCards).toHaveLength(1);
    expect(result[0].inProgressCards[0].task.id).toBe(task.id);
    expect(result[0].hasNoCards).toBe(false);
  });

  it('should group multiple cards under the same assignee', async () => {
    const task1 = createMockTask({ id: 1, externalId: 'WI-100' });
    const task2 = createMockTask({ id: 2, externalId: 'WI-101' });

    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([task1, task2]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(1);
    expect(result[0].inProgressCards).toHaveLength(2);
  });

  it('should separate cards by different assignees', async () => {
    const task1 = createMockTask({
      id: 1,
      externalId: 'WI-100',
      assignedToEmail: 'alice@example.com',
      assignedToName: 'Alice',
    });
    const task2 = createMockTask({
      id: 2,
      externalId: 'WI-101',
      assignedToEmail: 'bob@example.com',
      assignedToName: 'Bob',
    });

    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([task1, task2]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(2);
  });

  it('should sort members by name', async () => {
    const taskZ = createMockTask({
      id: 1,
      externalId: 'WI-100',
      assignedToEmail: 'zara@example.com',
      assignedToName: 'Zara',
    });
    const taskA = createMockTask({
      id: 2,
      externalId: 'WI-101',
      assignedToEmail: 'alice@example.com',
      assignedToName: 'Alice',
    });

    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([taskZ, taskA]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(2);
    expect(result[0].member.name).toBe('Alice');
    expect(result[1].member.name).toBe('Zara');
  });

  it('should not include closed/completed tasks (filtered at DB level)', async () => {
    const openTask = createMockTask({
      id: 2,
      externalId: 'WI-301',
      status: 'in_progress',
    });

    // DB query already filters out closed tasks, so mock only returns open ones
    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([openTask]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(1);
    expect(result[0].inProgressCards).toHaveLength(1);
    expect(result[0].inProgressCards[0].task.status).toBe('in_progress');
  });

  it('should include pending tasks (not just in_progress)', async () => {
    const pendingTask = createMockTask({
      id: 1,
      externalId: 'WI-400',
      status: 'pending',
    });
    const inProgressTask = createMockTask({
      id: 2,
      externalId: 'WI-401',
      status: 'in_progress',
    });

    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([
      pendingTask,
      inProgressTask,
    ]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(1);
    // Both pending and in_progress should be included
    expect(result[0].inProgressCards).toHaveLength(2);
  });

  it('should sort cards by priority (critical first) then by hours remaining', async () => {
    const lowPrioTask = createMockTask({
      id: 1,
      externalId: 'WI-500',
      priority: 'low',
    });
    const criticalTask = createMockTask({
      id: 2,
      externalId: 'WI-501',
      priority: 'critical',
    });

    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([
      lowPrioTask,
      criticalTask,
    ]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(1);
    expect(result[0].inProgressCards[0].task.priority).toBe('critical');
    expect(result[0].inProgressCards[1].task.priority).toBe('low');
  });

  it('should use real TeamMemberEntity when found by email', async () => {
    const realMember = {
      id: 42,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'developer',
      isActive: true,
    } as TeamMemberEntity;

    mockTeamMemberRepository.findByEmail.mockResolvedValue(realMember);
    mockTaskRepository.findOpenByAreaAndTypes.mockResolvedValue([
      createMockTask({ externalId: 'WI-600' }),
    ]);

    const result = await service.getSustentacaoMembersWithCards();

    expect(result).toHaveLength(1);
    expect(result[0].member.id).toBe(42);
  });
});
