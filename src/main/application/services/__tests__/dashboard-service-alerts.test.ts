import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger before any imports
vi.mock('@main/infrastructure/log/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    warn: vi.fn(),
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
vi.mock('../../repositories/task-update-repository', () => ({
  TaskUpdateRepository: vi.fn(),
}));

import {
  calculateBusinessDaysRemaining,
  calculateBusinessDaysSince,
  DashboardService,
} from '../dashboard-service';
import type { SprintAlert } from '../dashboard-service';
import { TaskEntity } from '../../entities/task.entity';
import { SprintEntity } from '../../entities/sprint.entity';

// ============================================================
// Pure function tests: calculateBusinessDaysRemaining
// ============================================================

describe('calculateBusinessDaysRemaining', () => {
  it('returns 0 when targetDate <= referenceDate', () => {
    const ref = new Date('2025-01-15'); // Wednesday
    const target = new Date('2025-01-14'); // Tuesday
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(0);
  });

  it('returns 0 when targetDate equals referenceDate', () => {
    const date = new Date('2025-01-15'); // Wednesday
    expect(calculateBusinessDaysRemaining(date, date)).toBe(0);
  });

  it('counts 1 business day for consecutive weekdays', () => {
    const ref = new Date('2025-01-15'); // Wednesday
    const target = new Date('2025-01-16'); // Thursday
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(1);
  });

  it('counts 5 business days for a full work week (Mon to next Mon)', () => {
    const ref = new Date('2025-01-13'); // Monday
    const target = new Date('2025-01-20'); // Next Monday
    // Tue(14), Wed(15), Thu(16), Fri(17), Mon(20) = 5
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(5);
  });

  it('skips weekends when counting', () => {
    const ref = new Date('2025-01-17'); // Friday
    const target = new Date('2025-01-20'); // Monday
    // Sat(18) and Sun(19) are skipped, Mon(20) = 1
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(1);
  });

  it('counts correctly across a two-week span', () => {
    const ref = new Date('2025-01-13'); // Monday
    const target = new Date('2025-01-24'); // Friday
    // Tue(14)-Fri(17) = 4, Mon(20)-Fri(24) = 5 → total = 9
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(9);
  });

  it('returns 0 when reference is Friday and target is Saturday', () => {
    const ref = new Date(2025, 0, 17); // Friday (local)
    const target = new Date(2025, 0, 18); // Saturday (local)
    // Saturday is not a business day
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(0);
  });

  it('handles reference on Saturday correctly', () => {
    const ref = new Date(2025, 0, 18); // Saturday (local)
    const target = new Date(2025, 0, 20); // Monday (local)
    // Sun(19) skipped, Mon(20) = 1
    expect(calculateBusinessDaysRemaining(ref, target)).toBe(1);
  });
});

// ============================================================
// Pure function tests: calculateBusinessDaysSince
// ============================================================

describe('calculateBusinessDaysSince', () => {
  it('returns 0 when referenceDate <= fromDate', () => {
    const from = new Date('2025-01-15');
    const ref = new Date('2025-01-14');
    expect(calculateBusinessDaysSince(from, ref)).toBe(0);
  });

  it('returns 0 when dates are the same', () => {
    const date = new Date('2025-01-15');
    expect(calculateBusinessDaysSince(date, date)).toBe(0);
  });

  it('counts 1 business day for consecutive weekdays', () => {
    const from = new Date('2025-01-15'); // Wednesday
    const ref = new Date('2025-01-16'); // Thursday
    expect(calculateBusinessDaysSince(from, ref)).toBe(1);
  });

  it('skips weekends', () => {
    const from = new Date('2025-01-17'); // Friday
    const ref = new Date('2025-01-20'); // Monday
    expect(calculateBusinessDaysSince(from, ref)).toBe(1);
  });

  it('counts 2 business days correctly', () => {
    const from = new Date('2025-01-15'); // Wednesday
    const ref = new Date('2025-01-17'); // Friday
    // Thu(16), Fri(17) = 2
    expect(calculateBusinessDaysSince(from, ref)).toBe(2);
  });
});

// ============================================================
// Integration tests: getProjetosItems with alerts
// ============================================================

function createMockTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 1,
    title: 'Test Task',
    status: 'pending',
    priority: 'medium',
    type: 'User Story',
    origin: 'azure_devops',
    areaPath: 'Tribo SEIF\\Projetos\\Team1',
    externalId: 'WI-100',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  } as TaskEntity;
}

function createMockSprint(overrides: Partial<SprintEntity> = {}): SprintEntity {
  return {
    id: 1,
    name: 'Sprint 1',
    startDate: new Date('2025-01-13'),
    endDate: new Date('2025-01-24'),
    isActive: true,
    teamId: 1,
    ...overrides,
  } as SprintEntity;
}

describe('DashboardService - getProjetosItems alerts', () => {
  let service: DashboardService;
  let mockTaskRepository: {
    findBySprint: ReturnType<typeof vi.fn>;
    findByParentId: ReturnType<typeof vi.fn>;
  };
  let mockSprintRepository: {
    findById: ReturnType<typeof vi.fn>;
    findByTeam: ReturnType<typeof vi.fn>;
  };
  let mockTaskLocalPriorityRepository: {
    findByExternalIds: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTaskRepository = {
      findBySprint: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn().mockResolvedValue([]),
    };
    mockSprintRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByTeam: vi.fn().mockResolvedValue([]),
    };
    mockTaskLocalPriorityRepository = {
      findByExternalIds: vi.fn().mockResolvedValue(new Map()),
    };

    service = new DashboardService(
      undefined, // teamMemberRepository
      mockTaskRepository as any,
      mockSprintRepository as any,
      undefined, // teamRepository
      undefined, // allocationRepository
      undefined, // allocationService
      mockTaskLocalPriorityRepository as any,
      undefined, // taskUpdateRepository
    );
  });

  it('returns empty alerts when sprint is not found', async () => {
    mockTaskRepository.findBySprint.mockResolvedValue([]);
    mockSprintRepository.findById.mockResolvedValue(null);

    const result = await service.getProjetosItems(1);

    expect(result.alerts).toEqual([]);
  });

  it('returns empty alerts when >5 business days remain', async () => {
    // Sprint ends in 10 business days from reference
    const referenceDate = new Date('2025-01-13'); // Monday
    const sprint = createMockSprint({
      endDate: new Date('2025-01-31'), // Friday, ~14 business days away
    });
    const pendingTask = createMockTask({ status: 'pending' });

    mockTaskRepository.findBySprint.mockResolvedValue([pendingTask]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toEqual([]);
  });

  it('generates pending_no_progress alerts when ≤5 business days remain', async () => {
    // Reference: Wednesday Jan 22, Sprint ends: Friday Jan 24
    // Business days remaining: Thu(23), Fri(24) = 2
    const referenceDate = new Date('2025-01-22');
    const sprint = createMockSprint({ endDate: new Date('2025-01-24') });
    const pendingTask = createMockTask({
      id: 10,
      title: 'Pending Item',
      status: 'pending',
    });

    mockTaskRepository.findBySprint.mockResolvedValue([pendingTask]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('pending_no_progress');
    expect(result.alerts[0].taskId).toBe(10);
    expect(result.alerts[0].taskTitle).toBe('Pending Item');
  });

  it('generates stagnant alerts for in_progress items not updated in 2+ business days', async () => {
    // Reference: Thursday Jan 23, Sprint ends: Friday Jan 24
    // Business days remaining: Fri(24) = 1
    const referenceDate = new Date('2025-01-23');
    const sprint = createMockSprint({ endDate: new Date('2025-01-24') });
    const stagnantTask = createMockTask({
      id: 20,
      title: 'Stagnant Item',
      status: 'in_progress',
      updatedAt: new Date('2025-01-20'), // Monday, 3 business days ago (Tue, Wed, Thu)
    });

    mockTaskRepository.findBySprint.mockResolvedValue([stagnantTask]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('stagnant');
    expect(result.alerts[0].taskId).toBe(20);
    expect(result.alerts[0].taskTitle).toBe('Stagnant Item');
  });

  it('does NOT generate stagnant alert for recently updated in_progress items', async () => {
    const referenceDate = new Date('2025-01-23'); // Thursday
    const sprint = createMockSprint({ endDate: new Date('2025-01-24') });
    const recentTask = createMockTask({
      id: 30,
      title: 'Recent Item',
      status: 'in_progress',
      updatedAt: new Date('2025-01-22'), // Wednesday, 1 business day ago
    });

    mockTaskRepository.findBySprint.mockResolvedValue([recentTask]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(0);
  });

  it('generates both pending and stagnant alerts together', async () => {
    const referenceDate = new Date('2025-01-23'); // Thursday
    const sprint = createMockSprint({ endDate: new Date('2025-01-24') });
    const pendingTask = createMockTask({
      id: 40,
      title: 'Pending',
      status: 'pending',
    });
    const stagnantTask = createMockTask({
      id: 41,
      title: 'Stagnant',
      status: 'in_progress',
      updatedAt: new Date('2025-01-20'), // Monday, 3 business days ago
    });

    mockTaskRepository.findBySprint.mockResolvedValue([
      pendingTask,
      stagnantTask,
    ]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(2);
    const types = result.alerts.map((a: SprintAlert) => a.type);
    expect(types).toContain('pending_no_progress');
    expect(types).toContain('stagnant');
  });

  it('does NOT generate alerts for completed or cancelled items', async () => {
    const referenceDate = new Date('2025-01-23');
    const sprint = createMockSprint({ endDate: new Date('2025-01-24') });
    const completedTask = createMockTask({
      id: 50,
      title: 'Done',
      status: 'Done',
    });
    const cancelledTask = createMockTask({
      id: 51,
      title: 'Cancelled',
      status: 'cancelled',
    });

    mockTaskRepository.findBySprint.mockResolvedValue([
      completedTask,
      cancelledTask,
    ]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(0);
  });

  it('generates alerts at exactly 5 business days remaining', async () => {
    // Reference: Monday Jan 13, Sprint ends: Monday Jan 20
    // Business days remaining: Tue(14), Wed(15), Thu(16), Fri(17), Mon(20) = 5
    const referenceDate = new Date('2025-01-13');
    const sprint = createMockSprint({ endDate: new Date('2025-01-20') });
    const pendingTask = createMockTask({
      id: 60,
      title: 'Boundary Pending',
      status: 'pending',
    });

    mockTaskRepository.findBySprint.mockResolvedValue([pendingTask]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('pending_no_progress');
  });

  it('does NOT generate alerts at 6 business days remaining', async () => {
    // Reference: Friday Jan 10, Sprint ends: Monday Jan 20
    // Business days remaining: Mon(13), Tue(14), Wed(15), Thu(16), Fri(17), Mon(20) = 6
    const referenceDate = new Date('2025-01-10');
    const sprint = createMockSprint({ endDate: new Date('2025-01-20') });
    const pendingTask = createMockTask({
      id: 70,
      title: 'No Alert Pending',
      status: 'pending',
    });

    mockTaskRepository.findBySprint.mockResolvedValue([pendingTask]);
    mockSprintRepository.findById.mockResolvedValue(sprint);

    const result = await service.getProjetosItems(1, referenceDate);

    expect(result.alerts).toHaveLength(0);
  });
});
