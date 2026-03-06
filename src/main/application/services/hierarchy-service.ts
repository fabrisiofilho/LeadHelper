import { TaskRepository } from '../repositories/task-repository';
import { TaskEntity } from '../entities/task.entity';
import { logger } from '@main/infrastructure/log/logger';

/**
 * Maximum number of ancestors to traverse to prevent infinite loops.
 * This protects against cycles in the parent_id chain.
 */
const MAX_ANCESTOR_DEPTH = 100;

/**
 * Maximum length for truncated titles in breadcrumbs.
 * Property 32: Titles > 30 characters are truncated to 27 chars + "..."
 */
const MAX_TITLE_LENGTH = 30;
const TRUNCATION_SUFFIX = '...';
const TRUNCATED_LENGTH = MAX_TITLE_LENGTH - TRUNCATION_SUFFIX.length; // 27

/**
 * Represents a single item in a breadcrumb trail.
 * Contains both the full title and a truncated version for display.
 */
export interface BreadcrumbItem {
  id: number;
  externalId?: string;
  title: string;
  type: string;
  truncatedTitle: string; // Max 30 characters
}

/**
 * Service for managing hierarchical navigation and breadcrumb construction.
 * Handles parent-child relationships between work items.
 *
 * Implements:
 * - Property 3: Busca de filhos por parent_id retorna relacionamentos corretos
 * - Property 30: Construção de breadcrumb percorre ancestrais
 * - Property 32: Truncamento de títulos no breadcrumb
 *
 * Validates: Requirements 3.2, 5.5, 15.7, 16.1, 16.2, 16.4, 16.6
 */
export class HierarchyService {
  private taskRepository: TaskRepository;

  constructor(taskRepository?: TaskRepository) {
    this.taskRepository = taskRepository ?? new TaskRepository();
  }

  /**
   * Get all direct children of a work item.
   *
   * Property 3: Returns all and only work items where parent_id = parentId.
   *
   * @param parentId - The ID of the parent work item
   * @returns Array of child TaskEntity objects
   */
  async getChildren(parentId: number): Promise<TaskEntity[]> {
    logger.debug('[HierarchyService.getChildren]', { parentId });

    const children = await this.taskRepository.findByParentId(parentId);
    return children;
  }

  /**
   * Count the number of direct children of a work item.
   *
   * Property 6: Counter reflects the actual count of records where parent_id = parentId.
   *
   * @param parentId - The ID of the parent work item
   * @returns The count of child work items
   */
  async countChildren(parentId: number): Promise<number> {
    logger.debug('[HierarchyService.countChildren]', { parentId });

    const children = await this.taskRepository.findByParentId(parentId);
    return children.length;
  }

  /**
   * Build a complete breadcrumb trail from root to the specified task.
   *
   * Property 30: Breadcrumb contains all ancestors in correct order (root → ... → parent → current item).
   * Property 32: Titles > 30 characters are truncated to 27 chars + "...".
   * Property 33: Root items (no parent) have a single breadcrumb segment.
   *
   * @param taskId - The ID of the task to build breadcrumb for
   * @returns Array of BreadcrumbItem from root to current task
   */
  async buildBreadcrumb(taskId: number): Promise<BreadcrumbItem[]> {
    logger.debug('[HierarchyService.buildBreadcrumb]', { taskId });

    // Get all ancestors including the current task
    const ancestors = await this.getAncestorsInternal(taskId, true);

    // Reverse to get root → ... → parent → current order
    const breadcrumb = ancestors
      .reverse()
      .map((task) => this.toBreadcrumbItem(task));

    return breadcrumb;
  }

  /**
   * Get all ancestors of a work item (excluding the item itself).
   *
   * Traverses the parent_id chain from the given task up to the root.
   *
   * @param taskId - The ID of the task to get ancestors for
   * @returns Array of ancestor TaskEntity objects (from immediate parent to root)
   */
  async getAncestors(taskId: number): Promise<TaskEntity[]> {
    logger.debug('[HierarchyService.getAncestors]', { taskId });

    return await this.getAncestorsInternal(taskId, false);
  }

  /**
   * Get root work items filtered by area path pattern.
   * Root items are those without a parent (parent_id IS NULL).
   *
   * @param areaPathPattern - SQL LIKE pattern for area_path (e.g., 'Tribo SEIF\\Sustentação\\%')
   * @returns Array of root TaskEntity objects matching the area path
   */
  async getRootItemsByArea(areaPathPattern: string): Promise<TaskEntity[]> {
    logger.debug('[HierarchyService.getRootItemsByArea]', { areaPathPattern });

    // Get all root tasks and filter by area path
    const rootTasks = await this.taskRepository.findRootTasks();

    // Filter by area path pattern (convert SQL LIKE to regex)
    const filteredTasks = rootTasks.filter((task) => {
      if (!task.areaPath) {
        return false;
      }
      return this.matchesLikePattern(task.areaPath, areaPathPattern);
    });

    return filteredTasks;
  }

  /**
   * Internal method to get ancestors with option to include the starting task.
   *
   * @param taskId - The ID of the task to start from
   * @param includeSelf - Whether to include the starting task in the result
   * @returns Array of TaskEntity objects (from current/parent to root)
   */
  private async getAncestorsInternal(
    taskId: number,
    includeSelf: boolean,
  ): Promise<TaskEntity[]> {
    const ancestors: TaskEntity[] = [];
    const visitedIds = new Set<number>();
    let currentId: number | undefined = taskId;
    let depth = 0;

    while (currentId !== undefined && depth < MAX_ANCESTOR_DEPTH) {
      // Detect cycles
      if (visitedIds.has(currentId)) {
        logger.warning(
          '[HierarchyService.getAncestorsInternal] Cycle detected in parent chain',
          { taskId, cycleAt: currentId },
        );
        break;
      }

      const task = await this.taskRepository.findOneBy({ id: currentId });
      if (!task) {
        // Task not found, stop traversal
        break;
      }

      visitedIds.add(currentId);

      // Include the task based on includeSelf flag
      if (depth > 0 || includeSelf) {
        ancestors.push(task);
      }

      currentId = task.parentId ?? undefined;
      depth++;
    }

    if (depth >= MAX_ANCESTOR_DEPTH) {
      logger.warning(
        '[HierarchyService.getAncestorsInternal] Max ancestor depth reached',
        { taskId, depth },
      );
    }

    return ancestors;
  }

  /**
   * Convert a TaskEntity to a BreadcrumbItem.
   *
   * Property 32: Truncates titles > 30 characters to 27 chars + "...".
   *
   * @param task - The task entity to convert
   * @returns BreadcrumbItem with truncated title
   */
  private toBreadcrumbItem(task: TaskEntity): BreadcrumbItem {
    return {
      id: task.id,
      externalId: task.externalId,
      title: task.title,
      type: task.type,
      truncatedTitle: this.truncateTitle(task.title),
    };
  }

  /**
   * Truncate a title to fit within the maximum length.
   *
   * Property 32: Titles > 30 characters show first 27 characters followed by "...".
   *
   * @param title - The title to truncate
   * @returns Truncated title (max 30 characters)
   */
  private truncateTitle(title: string): string {
    if (title.length <= MAX_TITLE_LENGTH) {
      return title;
    }
    return title.substring(0, TRUNCATED_LENGTH) + TRUNCATION_SUFFIX;
  }

  /**
   * Check if a value matches a SQL LIKE pattern.
   *
   * @param value - The value to check
   * @param pattern - SQL LIKE pattern (supports % and _ wildcards)
   * @returns True if the value matches the pattern
   */
  private matchesLikePattern(value: string, pattern: string): boolean {
    // Escape regex special characters except % and _
    let regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.');

    // Make it a full match
    regexPattern = `^${regexPattern}$`;

    const regex = new RegExp(regexPattern, 'i');
    return regex.test(value);
  }
}
