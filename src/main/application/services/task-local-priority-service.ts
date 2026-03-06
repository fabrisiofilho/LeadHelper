import { TaskLocalPriorityRepository } from '../repositories/task-local-priority-repository';
import { TaskLocalPriorityEntity } from '../entities/task-local-priority.entity';
import { logger } from '@main/infrastructure/log/logger';

/**
 * Error thrown when an invalid priority value is provided.
 * Property 7: Prioridade local aceita apenas valores válidos (0-5)
 */
export class InvalidPriorityError extends Error {
  constructor(priority: number) {
    super(
      `Prioridade inválida: ${priority}. O valor deve ser um inteiro entre 0 e 5.`,
    );
    this.name = 'InvalidPriorityError';
  }
}

/**
 * DTO for local priority data.
 */
export interface TaskLocalPriority {
  id: number;
  externalId: string;
  localPriority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service for managing local task priorities.
 * Local priorities are stored only in the local database, independent of Azure DevOps.
 *
 * Implements:
 * - Property 7: Validates priority range 0-5
 * - Property 9: Returns priority 0 for items without defined priority
 *
 * Validates: Requirements 4.1, 4.3, 4.6, 11.5
 */
export class TaskLocalPriorityService {
  private repository: TaskLocalPriorityRepository;

  constructor(repository?: TaskLocalPriorityRepository) {
    this.repository = repository ?? new TaskLocalPriorityRepository();
  }

  /**
   * Find a local priority by the work item's external ID.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The priority data or null if not found
   */
  async findByExternalId(
    externalId: string,
  ): Promise<TaskLocalPriority | null> {
    logger.debug('[TaskLocalPriorityService.findByExternalId]', { externalId });

    const entity = await this.repository.findByExternalId(externalId);
    if (!entity) {
      return null;
    }

    return this.mapToDto(entity);
  }

  /**
   * Find local priorities for multiple work items.
   * Returns a Map of externalId -> localPriority for efficient lookup.
   *
   * Property 9: Items without defined priority return 0.
   *
   * @param externalIds - Array of Azure DevOps work item IDs
   * @returns Map of externalId to priority value (0 for items without priority)
   */
  async findByExternalIds(externalIds: string[]): Promise<Map<string, number>> {
    logger.debug('[TaskLocalPriorityService.findByExternalIds]', {
      count: externalIds.length,
    });

    if (externalIds.length === 0) {
      return new Map();
    }

    const priorityMap = await this.repository.findByExternalIds(externalIds);

    // Property 9: Return 0 for items without defined priority
    const result = new Map<string, number>();
    for (const externalId of externalIds) {
      result.set(externalId, priorityMap.get(externalId) ?? 0);
    }

    return result;
  }

  /**
   * Set or update a local priority for a work item.
   *
   * Property 7: Validates that priority is an integer between 0 and 5.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param priority - The priority value (0-5, where 5 is most urgent)
   * @returns The created or updated priority data
   * @throws InvalidPriorityError if priority is not in range 0-5
   */
  async setPriority(
    externalId: string,
    priority: number,
  ): Promise<TaskLocalPriority> {
    logger.info('[TaskLocalPriorityService.setPriority]', {
      externalId,
      priority,
    });

    // Property 7: Validate priority range
    this.validatePriority(priority);

    const entity = await this.repository.upsert(externalId, priority);
    return this.mapToDto(entity);
  }

  /**
   * Remove a local priority for a work item.
   *
   * @param externalId - The Azure DevOps work item ID
   */
  async removePriority(externalId: string): Promise<void> {
    logger.info('[TaskLocalPriorityService.removePriority]', { externalId });

    await this.repository.deleteByExternalId(externalId);
  }

  /**
   * Validate that a priority value is within the valid range.
   *
   * Property 7: Priority must be an integer between 0 and 5.
   *
   * @param priority - The priority value to validate
   * @throws InvalidPriorityError if priority is not valid
   */
  private validatePriority(priority: number): void {
    if (!Number.isInteger(priority) || priority < 0 || priority > 5) {
      throw new InvalidPriorityError(priority);
    }
  }

  /**
   * Map entity to DTO.
   */
  private mapToDto(entity: TaskLocalPriorityEntity): TaskLocalPriority {
    return {
      id: entity.id,
      externalId: entity.externalId,
      localPriority: entity.localPriority,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
