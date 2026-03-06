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

// Mock the repository module to avoid TypeORM initialization
vi.mock('../../repositories/task-repository', () => ({
  TaskRepository: vi.fn(),
}));

import { HierarchyService } from '../hierarchy-service';
import { TaskEntity } from '../../entities/task.entity';

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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TaskEntity;
}

describe('HierarchyService', () => {
  let service: HierarchyService;
  let mockRepository: {
    findByParentId: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    findRootTasks: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findByParentId: vi.fn(),
      findOneBy: vi.fn(),
      findRootTasks: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new HierarchyService(mockRepository as any);
  });

  describe('getChildren', () => {
    /**
     * Property 3: Busca de filhos por parent_id retorna relacionamentos corretos
     * For any work item pai com ID X, a busca de filhos deve retornar todos e apenas os work items onde parent_id = X.
     * Validates: Requirements 3.2, 5.5, 15.7
     */
    it('should return all children for a given parent ID (Property 3)', async () => {
      const parentId = 100;
      const mockChildren = [
        createMockTask({ id: 1, parentId, title: 'Child 1' }),
        createMockTask({ id: 2, parentId, title: 'Child 2' }),
        createMockTask({ id: 3, parentId, title: 'Child 3' }),
      ];
      mockRepository.findByParentId.mockResolvedValue(mockChildren);

      const result = await service.getChildren(parentId);

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockChildren);
      expect(mockRepository.findByParentId).toHaveBeenCalledWith(parentId);
    });

    it('should return empty array when no children exist', async () => {
      mockRepository.findByParentId.mockResolvedValue([]);

      const result = await service.getChildren(999);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('countChildren', () => {
    /**
     * Property 6: Contador de filhos reflete quantidade real
     * For any work item pai, o contador de filhos exibido deve ser igual à contagem de registros onde parent_id = ID do pai.
     * Validates: Requirements 3.5, 17.2
     */
    it('should return correct count of children (Property 6)', async () => {
      const parentId = 100;
      const mockChildren = [
        createMockTask({ id: 1, parentId }),
        createMockTask({ id: 2, parentId }),
        createMockTask({ id: 3, parentId }),
        createMockTask({ id: 4, parentId }),
        createMockTask({ id: 5, parentId }),
      ];
      mockRepository.findByParentId.mockResolvedValue(mockChildren);

      const result = await service.countChildren(parentId);

      expect(result).toBe(5);
    });

    it('should return 0 when no children exist', async () => {
      mockRepository.findByParentId.mockResolvedValue([]);

      const result = await service.countChildren(999);

      expect(result).toBe(0);
    });
  });

  describe('buildBreadcrumb', () => {
    /**
     * Property 30: Construção de breadcrumb percorre ancestrais
     * For any work item, o breadcrumb deve conter todos os ancestrais na ordem correta (raiz → ... → pai → item atual).
     * Validates: Requirements 16.1, 16.2, 16.4
     */
    it('should build breadcrumb in correct order: root → parent → current (Property 30)', async () => {
      // Setup: Epic (root) → Feature → User Story (current)
      const epic = createMockTask({
        id: 1,
        title: 'Epic: SEIF Nacional',
        type: 'Epic',
        parentId: undefined,
      });
      const feature = createMockTask({
        id: 2,
        title: 'Feature: Fase 1',
        type: 'Feature',
        parentId: 1,
      });
      const userStory = createMockTask({
        id: 3,
        title: 'User Story: Login',
        type: 'User Story',
        parentId: 2,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(userStory) // First call: current task
        .mockResolvedValueOnce(feature) // Second call: parent
        .mockResolvedValueOnce(epic) // Third call: grandparent (root)
        .mockResolvedValueOnce(null); // Fourth call: no more parents

      const result = await service.buildBreadcrumb(3);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1); // Epic (root) first
      expect(result[0].type).toBe('Epic');
      expect(result[1].id).toBe(2); // Feature second
      expect(result[1].type).toBe('Feature');
      expect(result[2].id).toBe(3); // User Story (current) last
      expect(result[2].type).toBe('User Story');
    });

    /**
     * Property 32: Truncamento de títulos no breadcrumb
     * For any título com mais de 30 caracteres, o breadcrumb deve exibir os primeiros 27 caracteres seguidos de "...".
     * Validates: Requirements 16.6
     */
    it('should truncate titles longer than 30 characters (Property 32)', async () => {
      const longTitle =
        'This is a very long title that exceeds thirty characters';
      const task = createMockTask({
        id: 1,
        title: longTitle,
        type: 'Epic',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(null);

      const result = await service.buildBreadcrumb(1);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(longTitle); // Original title preserved
      expect(result[0].truncatedTitle).toBe('This is a very long title t...');
      expect(result[0].truncatedTitle.length).toBe(30);
    });

    it('should not truncate titles with exactly 30 characters', async () => {
      const exactTitle = '123456789012345678901234567890'; // Exactly 30 chars
      const task = createMockTask({
        id: 1,
        title: exactTitle,
        type: 'Task',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(null);

      const result = await service.buildBreadcrumb(1);

      expect(result[0].truncatedTitle).toBe(exactTitle);
      expect(result[0].truncatedTitle.length).toBe(30);
    });

    it('should not truncate titles shorter than 30 characters', async () => {
      const shortTitle = 'Short Title';
      const task = createMockTask({
        id: 1,
        title: shortTitle,
        type: 'Task',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(null);

      const result = await service.buildBreadcrumb(1);

      expect(result[0].truncatedTitle).toBe(shortTitle);
    });

    /**
     * Property 33: Breadcrumb de item raiz
     * For any item sem pai (parent_id IS NULL), o breadcrumb deve conter apenas um segmento.
     * Validates: Requirements 16.7
     */
    it('should return single item breadcrumb for root items (Property 33)', async () => {
      const rootTask = createMockTask({
        id: 1,
        title: 'Root Epic',
        type: 'Epic',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(rootTask)
        .mockResolvedValueOnce(null);

      const result = await service.buildBreadcrumb(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('Root Epic');
      expect(result[0].type).toBe('Epic');
    });

    it('should return empty breadcrumb when task not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.buildBreadcrumb(999);

      expect(result).toHaveLength(0);
    });

    it('should handle cycle detection in parent chain', async () => {
      // Setup: Task A → Task B → Task A (cycle)
      const taskA = createMockTask({
        id: 1,
        title: 'Task A',
        parentId: 2,
      });
      const taskB = createMockTask({
        id: 2,
        title: 'Task B',
        parentId: 1, // Points back to Task A - cycle!
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(taskA)
        .mockResolvedValueOnce(taskB)
        .mockResolvedValueOnce(taskA); // Would cause infinite loop

      const result = await service.buildBreadcrumb(1);

      // Should stop when cycle is detected
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should include externalId in breadcrumb items', async () => {
      const task = createMockTask({
        id: 1,
        title: 'Task with External ID',
        externalId: 'WI-12345',
        type: 'User Story',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(null);

      const result = await service.buildBreadcrumb(1);

      expect(result[0].externalId).toBe('WI-12345');
    });

    it('should use type field correctly', async () => {
      const task = createMockTask({
        id: 1,
        title: 'Manual Task',
        type: 'Task',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(null);

      const result = await service.buildBreadcrumb(1);

      expect(result[0].type).toBe('Task');
    });
  });

  describe('getAncestors', () => {
    it('should return ancestors from immediate parent to root', async () => {
      // Setup: Epic (root) → Feature → User Story (current)
      const epic = createMockTask({
        id: 1,
        title: 'Epic',
        parentId: undefined,
      });
      const feature = createMockTask({
        id: 2,
        title: 'Feature',
        parentId: 1,
      });
      const userStory = createMockTask({
        id: 3,
        title: 'User Story',
        parentId: 2,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(userStory) // Current task (not included)
        .mockResolvedValueOnce(feature) // Parent
        .mockResolvedValueOnce(epic) // Grandparent
        .mockResolvedValueOnce(null); // No more parents

      const result = await service.getAncestors(3);

      // Should not include the current task, only ancestors
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2); // Feature (immediate parent)
      expect(result[1].id).toBe(1); // Epic (root)
    });

    it('should return empty array for root items', async () => {
      const rootTask = createMockTask({
        id: 1,
        title: 'Root',
        parentId: undefined,
      });

      mockRepository.findOneBy
        .mockResolvedValueOnce(rootTask)
        .mockResolvedValueOnce(null);

      const result = await service.getAncestors(1);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when task not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.getAncestors(999);

      expect(result).toHaveLength(0);
    });
  });

  describe('getRootItemsByArea', () => {
    it('should return root items matching area path pattern', async () => {
      const sustentacaoTask = createMockTask({
        id: 1,
        title: 'Ticket 1',
        areaPath: 'Tribo SEIF\\Sustentação\\Team A',
        parentId: undefined,
      });
      const projetosTask = createMockTask({
        id: 2,
        title: 'Epic 1',
        areaPath: 'Tribo SEIF\\Projetos\\Team B',
        parentId: undefined,
      });
      const otherTask = createMockTask({
        id: 3,
        title: 'Other Task',
        areaPath: 'Other\\Path',
        parentId: undefined,
      });

      mockRepository.findRootTasks.mockResolvedValue([
        sustentacaoTask,
        projetosTask,
        otherTask,
      ]);

      const result = await service.getRootItemsByArea(
        'Tribo SEIF\\Sustentação\\%',
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].areaPath).toBe('Tribo SEIF\\Sustentação\\Team A');
    });

    it('should return empty array when no items match pattern', async () => {
      const task = createMockTask({
        id: 1,
        title: 'Task',
        areaPath: 'Other\\Path',
        parentId: undefined,
      });

      mockRepository.findRootTasks.mockResolvedValue([task]);

      const result = await service.getRootItemsByArea(
        'Tribo SEIF\\Sustentação\\%',
      );

      expect(result).toHaveLength(0);
    });

    it('should exclude items without area path', async () => {
      const taskWithPath = createMockTask({
        id: 1,
        title: 'Task with path',
        areaPath: 'Tribo SEIF\\Projetos\\Team A',
        parentId: undefined,
      });
      const taskWithoutPath = createMockTask({
        id: 2,
        title: 'Task without path',
        areaPath: undefined,
        parentId: undefined,
      });

      mockRepository.findRootTasks.mockResolvedValue([
        taskWithPath,
        taskWithoutPath,
      ]);

      const result = await service.getRootItemsByArea(
        'Tribo SEIF\\Projetos\\%',
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should handle pattern with underscore wildcard', async () => {
      const task1 = createMockTask({
        id: 1,
        title: 'Task 1',
        areaPath: 'Team A',
        parentId: undefined,
      });
      const task2 = createMockTask({
        id: 2,
        title: 'Task 2',
        areaPath: 'Team B',
        parentId: undefined,
      });

      mockRepository.findRootTasks.mockResolvedValue([task1, task2]);

      const result = await service.getRootItemsByArea('Team _');

      expect(result).toHaveLength(2);
    });

    it('should be case insensitive', async () => {
      const task = createMockTask({
        id: 1,
        title: 'Task',
        areaPath: 'TRIBO SEIF\\SUSTENTAÇÃO\\Team A',
        parentId: undefined,
      });

      mockRepository.findRootTasks.mockResolvedValue([task]);

      const result = await service.getRootItemsByArea(
        'tribo seif\\sustentação\\%',
      );

      expect(result).toHaveLength(1);
    });
  });
});
