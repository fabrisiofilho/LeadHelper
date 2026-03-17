import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all TypeORM entity/repository modules before importing the service
vi.mock('@main/infrastructure/database/data-source', () => ({
  getDataSource: vi.fn(() => ({
    getRepository: vi.fn(),
  })),
}));

vi.mock('@main/application/repositories/task-repository', () => ({
  TaskRepository: vi.fn(),
}));

vi.mock('@main/application/repositories/team-repository', () => ({
  TeamRepository: vi.fn(),
}));

vi.mock('@main/application/entities/task.entity', () => ({
  TaskEntity: vi.fn(),
}));

vi.mock('@main/application/entities/azure-devops-config.entity', () => ({
  AzureDevOpsConfigEntity: vi.fn(),
}));

vi.mock('@main/infrastructure/log/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@main/application/services/work-item-type-mapper', () => ({}));

vi.mock('@main/application/parsers/team-parser', () => ({}));

vi.mock('@main/application/parsers/task-parser', () => ({}));

vi.mock('@main/application/parsers/sprint-parser', () => ({}));

import { AzureDevOpsService } from '../azure-devops-service';

const mockConfig = {
  organizationUrl: 'https://dev.azure.com/myorg',
  projectName: 'MyProject',
  pat: 'fake-pat-token',
};

describe('AzureDevOpsService.fetchWorkItemUpdates', () => {
  let service: AzureDevOpsService;

  beforeEach(() => {
    service = new AzureDevOpsService();
    vi.restoreAllMocks();
  });

  function mockGetFullConfig(value: typeof mockConfig | null): void {
    service.getFullConfig = vi.fn().mockResolvedValue(value);
  }

  it('should return empty array when config is not found', async () => {
    mockGetFullConfig(null);
    const result = await service.fetchWorkItemUpdates(123);
    expect(result).toEqual([]);
  });

  it('should return empty array on HTTP error', async () => {
    mockGetFullConfig(mockConfig);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as Response);

    const result = await service.fetchWorkItemUpdates(999);
    expect(result).toEqual([]);
  });

  it('should return empty array on network error', async () => {
    mockGetFullConfig(mockConfig);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await service.fetchWorkItemUpdates(123);
    expect(result).toEqual([]);
  });

  it('should parse updates from API response correctly', async () => {
    mockGetFullConfig(mockConfig);

    const apiResponse = {
      count: 2,
      value: [
        {
          rev: 1,
          revisedBy: { displayName: 'John Doe' },
          revisedDate: '2024-01-15T10:00:00Z',
          fields: {
            'System.State': { newValue: 'New' },
            'System.Title': { newValue: 'My Task' },
          },
        },
        {
          rev: 2,
          revisedBy: { displayName: 'Jane Smith' },
          revisedDate: '2024-01-16T14:30:00Z',
          fields: {
            'System.State': { oldValue: 'New', newValue: 'Active' },
            'System.AssignedTo': { newValue: 'Jane Smith' },
          },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    } as Response);

    const result = await service.fetchWorkItemUpdates(42);

    expect(result).toHaveLength(2);

    expect(result[0].revision).toBe(1);
    expect(result[0].changedBy).toBe('John Doe');
    expect(result[0].changedDate).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result[0].fields).toHaveLength(2);
    expect(result[0].fields).toContainEqual({
      fieldName: 'System.State',
      oldValue: undefined,
      newValue: 'New',
    });

    expect(result[1].revision).toBe(2);
    expect(result[1].changedBy).toBe('Jane Smith');
    expect(result[1].fields).toContainEqual({
      fieldName: 'System.State',
      oldValue: 'New',
      newValue: 'Active',
    });
  });

  it('should skip updates without fields', async () => {
    mockGetFullConfig(mockConfig);

    const apiResponse = {
      value: [
        {
          rev: 1,
          revisedBy: { displayName: 'John' },
          revisedDate: '2024-01-15T10:00:00Z',
          fields: { 'System.State': { newValue: 'New' } },
        },
        {
          rev: 2,
          revisedBy: { displayName: 'John' },
          revisedDate: '2024-01-16T10:00:00Z',
          // no fields — relation-only update
        },
        {
          rev: 3,
          revisedBy: { displayName: 'John' },
          revisedDate: '2024-01-17T10:00:00Z',
          fields: {},
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    } as Response);

    const result = await service.fetchWorkItemUpdates(10);

    expect(result).toHaveLength(1);
    expect(result[0].revision).toBe(1);
  });

  it('should construct the correct API URL', async () => {
    mockGetFullConfig(mockConfig);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ value: [] }),
    } as Response);

    await service.fetchWorkItemUpdates(456);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://dev.azure.com/myorg/MyProject/_apis/wit/workitems/456/updates?api-version=7.0',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Basic '),
        }),
      }),
    );
  });

  it('should convert non-string field values to strings', async () => {
    mockGetFullConfig(mockConfig);

    const apiResponse = {
      value: [
        {
          rev: 1,
          revisedBy: { displayName: 'Dev' },
          revisedDate: '2024-01-15T10:00:00Z',
          fields: {
            'Microsoft.VSTS.Scheduling.StoryPoints': {
              oldValue: 3,
              newValue: 5,
            },
          },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    } as Response);

    const result = await service.fetchWorkItemUpdates(7);

    expect(result[0].fields[0]).toEqual({
      fieldName: 'Microsoft.VSTS.Scheduling.StoryPoints',
      oldValue: '3',
      newValue: '5',
    });
  });
});
