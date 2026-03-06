import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger before any imports
vi.mock('@main/infrastructure/log/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the repository module to avoid TypeORM initialization
vi.mock('../../repositories/task-local-kanban-repository', () => ({
  TaskLocalKanbanRepository: vi.fn(),
}));

import { TaskLocalKanbanService } from '../task-local-kanban-service';

interface MockTaskLocalKanbanEntity {
  id: number;
  externalId: string;
  localColumn: string;
  localOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

describe('TaskLocalKanbanService', () => {
  let service: TaskLocalKanbanService;
  let mockRepository: {
    findByExternalId: ReturnType<typeof vi.fn>;
    setPosition: ReturnType<typeof vi.fn>;
    resetPosition: ReturnType<typeof vi.fn>;
    findByContext: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findByExternalId: vi.fn(),
      setPosition: vi.fn(),
      resetPosition: vi.fn(),
      findByContext: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new TaskLocalKanbanService(mockRepository as any);
  });

  describe('findByExternalId', () => {
    it('should return Kanban position data when found', async () => {
      const mockEntity: MockTaskLocalKanbanEntity = {
        id: 1,
        externalId: 'WI-123',
        localColumn: 'In Progress',
        localOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.findByExternalId.mockResolvedValue(mockEntity);

      const result = await service.findByExternalId('WI-123');

      expect(result).toEqual({
        id: 1,
        externalId: 'WI-123',
        localColumn: 'In Progress',
        localOrder: 2,
        createdAt: mockEntity.createdAt,
        updatedAt: mockEntity.updatedAt,
      });
      expect(mockRepository.findByExternalId).toHaveBeenCalledWith('WI-123');
    });

    it('should return null when not found', async () => {
      mockRepository.findByExternalId.mockResolvedValue(null);

      const result = await service.findByExternalId('WI-999');

      expect(result).toBeNull();
    });
  });

  describe('setPosition', () => {
    /**
     * Validates: Requirements 18.3, 18.4
     * Local Kanban positions allow users to simulate card movements without syncing to Azure DevOps.
     */
    it('should set position and return the created/updated data', async () => {
      const mockEntity: MockTaskLocalKanbanEntity = {
        id: 1,
        externalId: 'WI-123',
        localColumn: 'Done',
        localOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.setPosition.mockResolvedValue(mockEntity);

      const result = await service.setPosition('WI-123', 'Done', 0);

      expect(result).toEqual({
        id: 1,
        externalId: 'WI-123',
        localColumn: 'Done',
        localOrder: 0,
        createdAt: mockEntity.createdAt,
        updatedAt: mockEntity.updatedAt,
      });
      expect(mockRepository.setPosition).toHaveBeenCalledWith(
        'WI-123',
        'Done',
        0,
      );
    });

    it('should accept different column values', async () => {
      const columns = ['To Do', 'In Progress', 'Done', 'Blocked'];

      for (const column of columns) {
        const mockEntity: MockTaskLocalKanbanEntity = {
          id: 1,
          externalId: 'WI-123',
          localColumn: column,
          localOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRepository.setPosition.mockResolvedValue(mockEntity);

        const result = await service.setPosition('WI-123', column, 1);

        expect(result.localColumn).toBe(column);
      }
    });

    it('should accept different order values', async () => {
      const orders = [0, 1, 5, 10, 100];

      for (const order of orders) {
        const mockEntity: MockTaskLocalKanbanEntity = {
          id: 1,
          externalId: 'WI-123',
          localColumn: 'To Do',
          localOrder: order,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRepository.setPosition.mockResolvedValue(mockEntity);

        const result = await service.setPosition('WI-123', 'To Do', order);

        expect(result.localOrder).toBe(order);
      }
    });
  });

  describe('resetPosition', () => {
    /**
     * Validates: Requirements 18.4
     * Resetting position returns the card to its original Azure DevOps status.
     */
    it('should call repository resetPosition', async () => {
      mockRepository.resetPosition.mockResolvedValue(undefined);

      await service.resetPosition('WI-123');

      expect(mockRepository.resetPosition).toHaveBeenCalledWith('WI-123');
    });

    it('should not throw when resetting non-existent position', async () => {
      mockRepository.resetPosition.mockResolvedValue(undefined);

      await expect(service.resetPosition('WI-999')).resolves.not.toThrow();
    });
  });

  describe('findByContext', () => {
    /**
     * Validates: Requirements 18.3, 18.4
     * Finding positions by context allows filtering Kanban cards by parent item.
     */
    it('should return all positions when no parentId is provided', async () => {
      const mockEntities: MockTaskLocalKanbanEntity[] = [
        {
          id: 1,
          externalId: 'WI-1',
          localColumn: 'To Do',
          localOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          externalId: 'WI-2',
          localColumn: 'In Progress',
          localOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepository.findByContext.mockResolvedValue(mockEntities);

      const result = await service.findByContext();

      expect(result).toHaveLength(2);
      expect(result[0].externalId).toBe('WI-1');
      expect(result[1].externalId).toBe('WI-2');
      expect(mockRepository.findByContext).toHaveBeenCalledWith(undefined);
    });

    it('should pass parentId to repository when provided', async () => {
      mockRepository.findByContext.mockResolvedValue([]);

      await service.findByContext(123);

      expect(mockRepository.findByContext).toHaveBeenCalledWith(123);
    });

    it('should return empty array when no positions exist', async () => {
      mockRepository.findByContext.mockResolvedValue([]);

      const result = await service.findByContext();

      expect(result).toEqual([]);
    });

    it('should map all entities to DTOs correctly', async () => {
      const mockEntities: MockTaskLocalKanbanEntity[] = [
        {
          id: 1,
          externalId: 'WI-1',
          localColumn: 'To Do',
          localOrder: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 2,
          externalId: 'WI-2',
          localColumn: 'Done',
          localOrder: 5,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];
      mockRepository.findByContext.mockResolvedValue(mockEntities);

      const result = await service.findByContext();

      expect(result[0]).toEqual({
        id: 1,
        externalId: 'WI-1',
        localColumn: 'To Do',
        localOrder: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      expect(result[1]).toEqual({
        id: 2,
        externalId: 'WI-2',
        localColumn: 'Done',
        localOrder: 5,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-04'),
      });
    });
  });
});
