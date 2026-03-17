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

import { DashboardService } from '../dashboard-service';
import { TaskEntity } from '../../entities/task.entity';
import { SprintEntity } from '../../entities/sprint.entity';

/**
 * Helper to create a mock TaskEntity
 */
function createMockTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 1,
    title: 'Test Task',
    status: 'pending',
    priority: 'medium',
    type: 'task',
    origin: 'azure_devops',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as TaskEntity;
}

/**
 * Helper to create a mock SprintEntity
 */
function createMockSprint(overrides: Partial<SprintEntity> = {}): SprintEntity {
  return {
    id: 1,
    name: 'Sprint 1',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-14'),
    isActive: true,
    tasks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as SprintEntity;
}

describe('DashboardService - Chart Methods', () => {
  let service: DashboardService;
  let mockTaskRepository: {
    findByParentId: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    findAllWithRelations: ReturnType<typeof vi.fn>;
    findBySprint: ReturnType<typeof vi.fn>;
  };
  let mockSprintRepository: {
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
  let mockTaskLocalPriorityRepository: {
    findByExternalIds: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTaskRepository = {
      findByParentId: vi.fn(),
      findOneBy: vi.fn(),
      findAllWithRelations: vi.fn(),
      findBySprint: vi.fn(),
    };
    mockSprintRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
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
    );
  });

  describe('getBurndownData', () => {
    /**
     * Property 41: Cálculo de dados do Burndown
     * For any Sprint, o gráfico de Burndown deve calcular para cada dia:
     * - planned: total de itens da Sprint
     * - completed: itens com status 'Done' ou 'Closed' e updatedAt <= data do ponto
     * Validates: Requirements 19.1, 19.9
     */
    it('should return empty array when sprint not found', async () => {
      mockSprintRepository.findById.mockResolvedValue(null);

      const result = await service.getBurndownData(999);

      expect(result).toEqual([]);
    });

    it('should calculate burndown data for each day in sprint (Property 41)', async () => {
      // Task completed on day 2
      const completedTask = createMockTask({
        id: 1,
        status: 'Done',
        updatedAt: new Date('2024-01-02'),
      });

      // Task still pending
      const pendingTask = createMockTask({
        id: 2,
        status: 'pending',
        updatedAt: new Date('2024-01-01'),
      });

      const sprint = createMockSprint({
        id: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
        tasks: [completedTask, pendingTask],
      });

      mockSprintRepository.findById.mockResolvedValue(sprint);

      const result = await service.getBurndownData(1);

      expect(result.length).toBeGreaterThan(0);
      // All points should have planned = 2 (total tasks)
      result.forEach((point) => {
        expect(point.planned).toBe(2);
      });
    });

    it('should count completed items correctly based on updatedAt', async () => {
      const task1 = createMockTask({
        id: 1,
        status: 'Done',
        updatedAt: new Date('2024-01-02'),
      });

      const task2 = createMockTask({
        id: 2,
        status: 'Closed',
        updatedAt: new Date('2024-01-04'),
      });

      const task3 = createMockTask({
        id: 3,
        status: 'pending',
        updatedAt: new Date('2024-01-01'),
      });

      const sprint = createMockSprint({
        id: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        tasks: [task1, task2, task3],
      });

      mockSprintRepository.findById.mockResolvedValue(sprint);

      const result = await service.getBurndownData(1);

      // All points should have planned = 3
      result.forEach((point) => {
        expect(point.planned).toBe(3);
      });

      // Find the point for Jan 3 - should have 1 completed (task1)
      const jan3Point = result.find((p) =>
        p.date.toISOString().startsWith('2024-01-03'),
      );
      expect(jan3Point?.completed).toBe(1);

      // Find the point for Jan 5 - should have 2 completed (task1 and task2)
      const jan5Point = result.find((p) =>
        p.date.toISOString().startsWith('2024-01-05'),
      );
      expect(jan5Point?.completed).toBe(2);
    });

    it('should handle sprint with no tasks', async () => {
      const sprint = createMockSprint({
        id: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
        tasks: [],
      });

      mockSprintRepository.findById.mockResolvedValue(sprint);

      const result = await service.getBurndownData(1);

      result.forEach((point) => {
        expect(point.planned).toBe(0);
        expect(point.completed).toBe(0);
      });
    });
  });

  describe('getStatusDistribution', () => {
    /**
     * Property 42: Cálculo de distribuição por status
     * For any contexto (Sprint ou item pai), o gráfico de pizza deve mostrar a contagem correta de itens por status.
     * Validates: Requirements 19.2
     */
    it('should return correct count per status (Property 42)', async () => {
      const tasks = [
        createMockTask({ id: 1, status: 'pending' }),
        createMockTask({ id: 2, status: 'pending' }),
        createMockTask({ id: 3, status: 'in_progress' }),
        createMockTask({ id: 4, status: 'Done' }),
        createMockTask({ id: 5, status: 'Done' }),
        createMockTask({ id: 6, status: 'Done' }),
      ];

      mockTaskRepository.findAllWithRelations.mockResolvedValue(tasks);

      const result = await service.getStatusDistribution();

      expect(result).toHaveLength(3);

      const doneStatus = result.find((s) => s.status === 'Done');
      expect(doneStatus?.count).toBe(3);

      const pendingStatus = result.find((s) => s.status === 'pending');
      expect(pendingStatus?.count).toBe(2);

      const inProgressStatus = result.find((s) => s.status === 'in_progress');
      expect(inProgressStatus?.count).toBe(1);
    });

    it('should filter by parentId when provided (Property 45)', async () => {
      const parentId = 100;
      const children = [
        createMockTask({ id: 1, status: 'pending', parentId }),
        createMockTask({ id: 2, status: 'Done', parentId }),
      ];

      mockTaskRepository.findByParentId.mockResolvedValue(children);

      const result = await service.getStatusDistribution(parentId);

      expect(mockTaskRepository.findByParentId).toHaveBeenCalledWith(parentId);
      expect(result).toHaveLength(2);
    });

    it('should include color for each status', async () => {
      const tasks = [
        createMockTask({ id: 1, status: 'New' }),
        createMockTask({ id: 2, status: 'Active' }),
        createMockTask({ id: 3, status: 'Done' }),
        createMockTask({ id: 4, status: 'Closed' }),
      ];

      mockTaskRepository.findAllWithRelations.mockResolvedValue(tasks);

      const result = await service.getStatusDistribution();

      result.forEach((item) => {
        expect(item.color).toBeDefined();
        expect(item.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should sort by count descending', async () => {
      const tasks = [
        createMockTask({ id: 1, status: 'A' }),
        createMockTask({ id: 2, status: 'B' }),
        createMockTask({ id: 3, status: 'B' }),
        createMockTask({ id: 4, status: 'C' }),
        createMockTask({ id: 5, status: 'C' }),
        createMockTask({ id: 6, status: 'C' }),
      ];

      mockTaskRepository.findAllWithRelations.mockResolvedValue(tasks);

      const result = await service.getStatusDistribution();

      expect(result[0].status).toBe('C');
      expect(result[0].count).toBe(3);
      expect(result[1].status).toBe('B');
      expect(result[1].count).toBe(2);
      expect(result[2].status).toBe('A');
      expect(result[2].count).toBe(1);
    });

    it('should return empty array when no tasks', async () => {
      mockTaskRepository.findAllWithRelations.mockResolvedValue([]);

      const result = await service.getStatusDistribution();

      expect(result).toEqual([]);
    });
  });

  describe('getAssigneeDistribution', () => {
    /**
     * Property 43: Cálculo de distribuição por assignee
     * For any contexto (Sprint ou item pai), o gráfico de barras deve mostrar a contagem correta de itens por assignee.
     * Validates: Requirements 19.3
     */
    it('should return correct count per assignee (Property 43)', async () => {
      const tasks = [
        createMockTask({ id: 1, assignedToName: 'Alice' }),
        createMockTask({ id: 2, assignedToName: 'Alice' }),
        createMockTask({ id: 3, assignedToName: 'Bob' }),
        createMockTask({ id: 4, assignedToName: undefined }),
      ];

      mockTaskRepository.findAllWithRelations.mockResolvedValue(tasks);

      const result = await service.getAssigneeDistribution();

      expect(result).toHaveLength(3);

      const alice = result.find((a) => a.assignee === 'Alice');
      expect(alice?.count).toBe(2);

      const bob = result.find((a) => a.assignee === 'Bob');
      expect(bob?.count).toBe(1);

      const unassigned = result.find((a) => a.assignee === 'Não atribuído');
      expect(unassigned?.count).toBe(1);
    });

    it('should filter by parentId when provided (Property 45)', async () => {
      const parentId = 100;
      const children = [
        createMockTask({ id: 1, assignedToName: 'Alice', parentId }),
        createMockTask({ id: 2, assignedToName: 'Bob', parentId }),
      ];

      mockTaskRepository.findByParentId.mockResolvedValue(children);

      const result = await service.getAssigneeDistribution(parentId);

      expect(mockTaskRepository.findByParentId).toHaveBeenCalledWith(parentId);
      expect(result).toHaveLength(2);
    });

    it('should sort by count descending', async () => {
      const tasks = [
        createMockTask({ id: 1, assignedToName: 'Alice' }),
        createMockTask({ id: 2, assignedToName: 'Bob' }),
        createMockTask({ id: 3, assignedToName: 'Bob' }),
        createMockTask({ id: 4, assignedToName: 'Charlie' }),
        createMockTask({ id: 5, assignedToName: 'Charlie' }),
        createMockTask({ id: 6, assignedToName: 'Charlie' }),
      ];

      mockTaskRepository.findAllWithRelations.mockResolvedValue(tasks);

      const result = await service.getAssigneeDistribution();

      expect(result[0].assignee).toBe('Charlie');
      expect(result[0].count).toBe(3);
      expect(result[1].assignee).toBe('Bob');
      expect(result[1].count).toBe(2);
      expect(result[2].assignee).toBe('Alice');
      expect(result[2].count).toBe(1);
    });

    it('should return empty array when no tasks', async () => {
      mockTaskRepository.findAllWithRelations.mockResolvedValue([]);

      const result = await service.getAssigneeDistribution();

      expect(result).toEqual([]);
    });
  });

  describe('getHierarchyProgress', () => {
    /**
     * Property 44: Cálculo de progresso hierárquico
     * For any item pai, o gráfico de progresso deve mostrar a proporção correta de filhos concluídos vs total de filhos.
     * Validates: Requirements 19.4
     */
    it('should return correct progress for parent item (Property 44)', async () => {
      const parentId = 100;
      const parentTask = createMockTask({
        id: parentId,
        title: 'Parent User Story',
      });
      const children = [
        createMockTask({ id: 1, status: 'Done', parentId }),
        createMockTask({ id: 2, status: 'Done', parentId }),
        createMockTask({ id: 3, status: 'pending', parentId }),
        createMockTask({ id: 4, status: 'in_progress', parentId }),
      ];

      mockTaskRepository.findOneBy.mockResolvedValue(parentTask);
      mockTaskRepository.findByParentId.mockResolvedValue(children);

      const result = await service.getHierarchyProgress(parentId);

      expect(result.parentId).toBe(parentId);
      expect(result.parentTitle).toBe('Parent User Story');
      expect(result.totalChildren).toBe(4);
      expect(result.completedChildren).toBe(2);
      expect(result.progressPercent).toBe(50);
    });

    it('should return 0 progress when no children', async () => {
      const parentId = 100;
      const parentTask = createMockTask({
        id: parentId,
        title: 'Empty Parent',
      });

      mockTaskRepository.findOneBy.mockResolvedValue(parentTask);
      mockTaskRepository.findByParentId.mockResolvedValue([]);

      const result = await service.getHierarchyProgress(parentId);

      expect(result.totalChildren).toBe(0);
      expect(result.completedChildren).toBe(0);
      expect(result.progressPercent).toBe(0);
    });

    it('should return 100 progress when all children completed', async () => {
      const parentId = 100;
      const parentTask = createMockTask({
        id: parentId,
        title: 'Completed Parent',
      });
      const children = [
        createMockTask({ id: 1, status: 'Done', parentId }),
        createMockTask({ id: 2, status: 'Closed', parentId }),
        createMockTask({ id: 3, status: 'completed', parentId }),
      ];

      mockTaskRepository.findOneBy.mockResolvedValue(parentTask);
      mockTaskRepository.findByParentId.mockResolvedValue(children);

      const result = await service.getHierarchyProgress(parentId);

      expect(result.totalChildren).toBe(3);
      expect(result.completedChildren).toBe(3);
      expect(result.progressPercent).toBe(100);
    });

    it('should return default values when parent not found', async () => {
      mockTaskRepository.findOneBy.mockResolvedValue(null);

      const result = await service.getHierarchyProgress(999);

      expect(result.parentId).toBe(999);
      expect(result.parentTitle).toBe('Unknown');
      expect(result.totalChildren).toBe(0);
      expect(result.completedChildren).toBe(0);
      expect(result.progressPercent).toBe(0);
    });

    it('should round progress percentage', async () => {
      const parentId = 100;
      const parentTask = createMockTask({
        id: parentId,
        title: 'Parent',
      });
      const children = [
        createMockTask({ id: 1, status: 'Done', parentId }),
        createMockTask({ id: 2, status: 'pending', parentId }),
        createMockTask({ id: 3, status: 'pending', parentId }),
      ];

      mockTaskRepository.findOneBy.mockResolvedValue(parentTask);
      mockTaskRepository.findByParentId.mockResolvedValue(children);

      const result = await service.getHierarchyProgress(parentId);

      // 1/3 = 33.33... should round to 33
      expect(result.progressPercent).toBe(33);
    });
  });
});
