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
vi.mock('../../repositories/task-local-priority-repository', () => ({
  TaskLocalPriorityRepository: vi.fn(),
}));

import {
  TaskLocalPriorityService,
  InvalidPriorityError,
} from '../task-local-priority-service';

interface MockTaskLocalPriorityEntity {
  id: number;
  externalId: string;
  localPriority: number;
  createdAt: Date;
  updatedAt: Date;
}

describe('TaskLocalPriorityService', () => {
  let service: TaskLocalPriorityService;
  let mockRepository: {
    findByExternalId: ReturnType<typeof vi.fn>;
    findByExternalIds: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    deleteByExternalId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findByExternalId: vi.fn(),
      findByExternalIds: vi.fn(),
      upsert: vi.fn(),
      deleteByExternalId: vi.fn(),
    };
    service = new TaskLocalPriorityService(mockRepository as any);
  });

  describe('findByExternalId', () => {
    it('should return priority data when found', async () => {
      const mockEntity: MockTaskLocalPriorityEntity = {
        id: 1,
        externalId: 'WI-123',
        localPriority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.findByExternalId.mockResolvedValue(mockEntity);

      const result = await service.findByExternalId('WI-123');

      expect(result).toEqual({
        id: 1,
        externalId: 'WI-123',
        localPriority: 3,
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

  describe('findByExternalIds', () => {
    /**
     * Property 9: Prioridade padrão para itens sem prioridade definida
     * For any work item sem prioridade local definida, o sistema deve considerar prioridade 0.
     * Validates: Requirements 4.6
     */
    it('should return 0 for items without defined priority (Property 9)', async () => {
      const priorityMap = new Map<string, number>();
      priorityMap.set('WI-123', 3);
      // WI-456 is not in the map (no priority defined)
      mockRepository.findByExternalIds.mockResolvedValue(priorityMap);

      const result = await service.findByExternalIds(['WI-123', 'WI-456']);

      expect(result.get('WI-123')).toBe(3);
      expect(result.get('WI-456')).toBe(0); // Property 9: default to 0
    });

    it('should return empty map for empty input', async () => {
      const result = await service.findByExternalIds([]);

      expect(result.size).toBe(0);
      expect(mockRepository.findByExternalIds).not.toHaveBeenCalled();
    });

    it('should return all priorities for multiple items', async () => {
      const priorityMap = new Map<string, number>();
      priorityMap.set('WI-1', 1);
      priorityMap.set('WI-2', 5);
      priorityMap.set('WI-3', 2);
      mockRepository.findByExternalIds.mockResolvedValue(priorityMap);

      const result = await service.findByExternalIds(['WI-1', 'WI-2', 'WI-3']);

      expect(result.get('WI-1')).toBe(1);
      expect(result.get('WI-2')).toBe(5);
      expect(result.get('WI-3')).toBe(2);
    });
  });

  describe('setPriority', () => {
    /**
     * Property 7: Prioridade local aceita apenas valores válidos (0-5)
     * For any tentativa de definir prioridade local, o sistema deve aceitar apenas valores inteiros de 0 a 5.
     * Validates: Requirements 4.1
     */
    describe('Property 7: Priority validation (0-5)', () => {
      it('should accept priority 0', async () => {
        const mockEntity: MockTaskLocalPriorityEntity = {
          id: 1,
          externalId: 'WI-123',
          localPriority: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRepository.upsert.mockResolvedValue(mockEntity);

        const result = await service.setPriority('WI-123', 0);

        expect(result.localPriority).toBe(0);
        expect(mockRepository.upsert).toHaveBeenCalledWith('WI-123', 0);
      });

      it('should accept priority 5', async () => {
        const mockEntity: MockTaskLocalPriorityEntity = {
          id: 1,
          externalId: 'WI-123',
          localPriority: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRepository.upsert.mockResolvedValue(mockEntity);

        const result = await service.setPriority('WI-123', 5);

        expect(result.localPriority).toBe(5);
        expect(mockRepository.upsert).toHaveBeenCalledWith('WI-123', 5);
      });

      it('should accept all valid priorities (1-4)', async () => {
        for (const priority of [1, 2, 3, 4]) {
          const mockEntity: MockTaskLocalPriorityEntity = {
            id: 1,
            externalId: 'WI-123',
            localPriority: priority,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockRepository.upsert.mockResolvedValue(mockEntity);

          const result = await service.setPriority('WI-123', priority);

          expect(result.localPriority).toBe(priority);
        }
      });

      it('should reject priority -1', async () => {
        await expect(service.setPriority('WI-123', -1)).rejects.toThrow(
          InvalidPriorityError,
        );
        expect(mockRepository.upsert).not.toHaveBeenCalled();
      });

      it('should reject priority 6', async () => {
        await expect(service.setPriority('WI-123', 6)).rejects.toThrow(
          InvalidPriorityError,
        );
        expect(mockRepository.upsert).not.toHaveBeenCalled();
      });

      it('should reject non-integer values', async () => {
        await expect(service.setPriority('WI-123', 2.5)).rejects.toThrow(
          InvalidPriorityError,
        );
        expect(mockRepository.upsert).not.toHaveBeenCalled();
      });

      it('should reject negative values', async () => {
        await expect(service.setPriority('WI-123', -100)).rejects.toThrow(
          InvalidPriorityError,
        );
        expect(mockRepository.upsert).not.toHaveBeenCalled();
      });

      it('should reject large values', async () => {
        await expect(service.setPriority('WI-123', 100)).rejects.toThrow(
          InvalidPriorityError,
        );
        expect(mockRepository.upsert).not.toHaveBeenCalled();
      });
    });

    it('should return the created/updated priority', async () => {
      const mockEntity: MockTaskLocalPriorityEntity = {
        id: 1,
        externalId: 'WI-123',
        localPriority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.upsert.mockResolvedValue(mockEntity);

      const result = await service.setPriority('WI-123', 3);

      expect(result).toEqual({
        id: 1,
        externalId: 'WI-123',
        localPriority: 3,
        createdAt: mockEntity.createdAt,
        updatedAt: mockEntity.updatedAt,
      });
    });
  });

  describe('removePriority', () => {
    it('should call repository deleteByExternalId', async () => {
      mockRepository.deleteByExternalId.mockResolvedValue(undefined);

      await service.removePriority('WI-123');

      expect(mockRepository.deleteByExternalId).toHaveBeenCalledWith('WI-123');
    });

    it('should not throw when removing non-existent priority', async () => {
      mockRepository.deleteByExternalId.mockResolvedValue(undefined);

      await expect(service.removePriority('WI-999')).resolves.not.toThrow();
    });
  });

  describe('InvalidPriorityError', () => {
    it('should have correct error name', () => {
      const error = new InvalidPriorityError(10);
      expect(error.name).toBe('InvalidPriorityError');
    });

    it('should include the invalid value in the message', () => {
      const error = new InvalidPriorityError(10);
      expect(error.message).toContain('10');
      expect(error.message).toContain('0');
      expect(error.message).toContain('5');
    });
  });
});
