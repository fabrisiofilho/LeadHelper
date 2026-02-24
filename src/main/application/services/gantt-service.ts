import { AllocationRepository } from '../repositories/allocation-repository';
import { AllocationEntity } from '../entities/allocation.entity';

export interface GanttItem {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  color: string;
  teamMemberId?: number;
  teamMemberName?: string;
  taskId?: number;
  taskTitle?: string;
  allocationId: number;
  sprintId?: number;
  sprintName?: string;
}

export interface GanttData {
  items: GanttItem[];
  startDate: Date;
  endDate: Date;
}

export interface GanttFilters {
  groupBy: 'team_member' | 'task';
  startDate: Date;
  endDate: Date;
  teamMemberIds?: number[];
  taskIds?: number[];
  teamId?: number;
  sprintId?: number;
}

// Predefined color palette for tasks
const TASK_COLORS = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#FFEB3B', // Yellow
  '#3F51B5', // Indigo
  '#009688', // Teal
  '#FF5722', // Deep Orange
  '#673AB7', // Deep Purple
  '#8BC34A', // Light Green
];

export class GanttService {
  private repository: AllocationRepository;
  private taskColorMap: Map<number, string> = new Map();

  constructor(repository?: AllocationRepository) {
    this.repository = repository ?? new AllocationRepository();
  }

  /**
   * Get Gantt chart data with allocations grouped by team member or task
   */
  async getGanttData(filters: GanttFilters): Promise<GanttData> {
    // Fetch allocations that overlap with the filter period
    const allocations = await this.repository.findByPeriod(
      filters.startDate,
      filters.endDate,
    );

    // Apply additional filters
    let filteredAllocations = this.applyFilters(allocations, filters);

    // Generate colors for all tasks
    this.generateTaskColors(filteredAllocations);

    // Map allocations to Gantt items based on grouping
    const items = this.mapToGanttItems(filteredAllocations, filters.groupBy);

    return {
      items,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }

  /**
   * Apply team member and task filters to allocations
   */
  private applyFilters(
    allocations: AllocationEntity[],
    filters: GanttFilters,
  ): AllocationEntity[] {
    let result = allocations;

    if (filters.teamMemberIds && filters.teamMemberIds.length > 0) {
      result = result.filter((a) =>
        filters.teamMemberIds!.includes(a.teamMemberId),
      );
    }

    if (filters.taskIds && filters.taskIds.length > 0) {
      result = result.filter((a) => filters.taskIds!.includes(a.taskId));
    }

    if (filters.teamId) {
      result = result.filter((a) => a.task?.teamId === filters.teamId);
    }

    if (filters.sprintId) {
      result = result.filter((a) => a.task?.sprintId === filters.sprintId);
    }

    return result;
  }

  /**
   * Generate distinct colors for each task
   */
  private generateTaskColors(allocations: AllocationEntity[]): void {
    // Get unique task IDs
    const taskIds = Array.from(new Set(allocations.map((a) => a.taskId)));

    // Assign colors from palette or generate hash-based colors
    taskIds.forEach((taskId, index) => {
      if (!this.taskColorMap.has(taskId)) {
        if (index < TASK_COLORS.length) {
          this.taskColorMap.set(taskId, TASK_COLORS[index]);
        } else {
          // Generate hash-based color for tasks beyond palette
          this.taskColorMap.set(taskId, this.generateHashColor(taskId));
        }
      }
    });
  }

  /**
   * Generate a color based on task ID hash
   */
  private generateHashColor(taskId: number): string {
    // Use golden ratio for better color distribution
    const goldenRatio = 0.618033988749895;
    const hue = ((taskId * goldenRatio) % 1) * 360;
    return `hsl(${Math.round(hue)}, 70%, 50%)`;
  }

  /**
   * Get color for a specific task
   */
  getTaskColor(taskId: number): string {
    if (this.taskColorMap.has(taskId)) {
      return this.taskColorMap.get(taskId)!;
    }
    return this.generateHashColor(taskId);
  }

  /**
   * Map allocations to Gantt items based on grouping
   */
  private mapToGanttItems(
    allocations: AllocationEntity[],
    groupBy: 'team_member' | 'task',
  ): GanttItem[] {
    return allocations.map((allocation) => {
      const name = this.getItemName(allocation, groupBy);
      const color =
        this.taskColorMap.get(allocation.taskId) ||
        this.generateHashColor(allocation.taskId);

      return {
        id: `allocation-${allocation.id}`,
        name,
        start: allocation.startDate,
        end: allocation.endDate,
        progress: 0, // Progress can be calculated based on current date vs allocation period
        color,
        teamMemberId: allocation.teamMemberId,
        teamMemberName: allocation.teamMember?.name,
        taskId: allocation.taskId,
        taskTitle: allocation.task?.title,
        allocationId: allocation.id,
        sprintId: allocation.task?.sprintId,
        sprintName: allocation.task?.sprint?.name,
      };
    });
  }

  /**
   * Get display name for a Gantt item based on grouping
   */
  private getItemName(
    allocation: AllocationEntity,
    groupBy: 'team_member' | 'task',
  ): string {
    if (groupBy === 'team_member') {
      // When grouped by team member, show task name
      return allocation.task?.title || `Task ${allocation.taskId}`;
    } else {
      // When grouped by task, show team member name
      return allocation.teamMember?.name || `Member ${allocation.teamMemberId}`;
    }
  }
}
