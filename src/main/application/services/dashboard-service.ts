import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';
import { SprintRepository } from '../repositories/sprint-repository';
import { TeamRepository } from '../repositories/team-repository';
import { TeamMemberAllocationRepository } from '../repositories/team-member-allocation-repository';
import { TeamMemberAllocationService } from './team-member-allocation-service';
import { TaskLocalPriorityRepository } from '../repositories/task-local-priority-repository';
import { TeamMemberEntity } from '../entities/team-member.entity';
import { TaskEntity } from '../entities/task.entity';
import type { AllocationConflict } from './team-member-allocation-service';
import { logger } from '@main/infrastructure/log/logger';

export interface DashboardPeriod {
  startDate: Date;
  endDate: Date;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamMemberWorkload {
  teamMember: TeamMember;
  totalWorkload: number;
}

export interface DashboardSummary {
  activeMembers: number;
  tasksInProgress: number;
  totalAllocations: number;
  membersWithHighWorkload: TeamMemberWorkload[];
  membersWithoutAllocation: TeamMember[];
}

export interface AllocationDashboard {
  activeAllocations: number;
  membersAllocated: number;
  membersWithoutAllocation: TeamMember[];
  allocationConflicts: AllocationConflict[];
  allocationsByTeam: { teamName: string; count: number }[];
}

export interface TaskManagementDashboard {
  totalTasks: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByType: { type: string; count: number }[];
  tasksByTeam: { teamName: string; count: number }[];
  unassignedTasks: number;
}

export interface SprintSummary {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
}

export interface SprintDashboard {
  activeSprints: SprintSummary[];
  completedSprints: number;
  tasksBySprint: { sprintName: string; total: number; completed: number }[];
  velocity: { sprintName: string; storyPoints: number }[];
}

/**
 * Options for filtering Sustentação dashboard items.
 */
export interface SustentacaoOptions {
  staleDays?: number;
  sortBy?: 'priority' | 'updatedAt';
}

/**
 * Represents a work item in the Sustentação dashboard.
 * Includes local priority, stale status, and children count.
 */
export interface SustentacaoItem {
  task: TaskEntity;
  localPriority: number;
  isStale: boolean;
  daysSinceUpdate: number;
  childrenCount: number;
}

/**
 * Represents a work item in the Projetos dashboard.
 * Includes progress calculation based on completed children.
 */
export interface ProjetosItem {
  task: TaskEntity;
  localPriority: number;
  childrenCount: number;
  completedChildrenCount: number;
  progressPercent: number;
}

/**
 * Represents a User Story with progress calculation.
 * Property 10: Progress = (completedChildren / totalChildren) * 100
 */
export interface UserStoryProgress {
  task: TaskEntity;
  totalChildren: number;
  completedChildren: number;
  progressPercent: number;
  isComplete: boolean;
}

/**
 * Represents a point in the Burndown chart.
 * Property 41: For each day, planned = total items, completed = items with Done/Closed status
 */
export interface BurndownPoint {
  date: Date;
  planned: number;
  completed: number;
}

/**
 * Represents status distribution for pie chart.
 * Property 42: Count of items per status with color mapping.
 */
export interface StatusCount {
  status: string;
  count: number;
  color: string;
}

/**
 * Represents assignee distribution for bar chart.
 * Property 43: Count of items per assignee.
 */
export interface AssigneeCount {
  assignee: string;
  count: number;
}

/**
 * Represents hierarchy progress for a parent item.
 * Property 44: Proportion of completed children vs total children.
 */
export interface HierarchyProgress {
  parentId: number;
  parentTitle: string;
  totalChildren: number;
  completedChildren: number;
  progressPercent: number;
}

/**
 * Default Area Path patterns for filtering by team.
 * Property 25: Fallback to default values if not configured.
 */
const SUSTENTACAO_AREA_PATH_PATTERN = 'Tribo SEIF\\Sustentação\\';
const PROJETOS_AREA_PATH_PATTERN = 'Tribo SEIF\\Projetos\\';

/**
 * Valid work item types for Sustentação dashboard.
 * Property 1: type IN ('Ticket', 'Improvement')
 */
const SUSTENTACAO_WORK_ITEM_TYPES = ['Ticket', 'Improvement'];

/**
 * Statuses that indicate a work item is closed/completed.
 * Property 1: status NOT IN ('completed', 'cancelled')
 */
const CLOSED_STATUSES = ['completed', 'cancelled', 'Done', 'Closed'];

/**
 * Statuses that indicate a task is completed for progress calculation.
 * Property 10, 11: Tasks with these statuses are considered completed.
 */
const COMPLETED_STATUSES = ['completed', 'Done', 'Closed'];

/**
 * Color mapping for status badges.
 * Property 36: New=blue, Active/In Progress=yellow, Resolved/Done=green, Closed=gray
 */
const STATUS_COLORS: Record<string, string> = {
  New: '#2196F3', // blue
  Active: '#FFC107', // yellow
  'In Progress': '#FFC107', // yellow
  Resolved: '#4CAF50', // green
  Done: '#4CAF50', // green
  Closed: '#9E9E9E', // gray
  pending: '#2196F3', // blue
  in_progress: '#FFC107', // yellow
  completed: '#4CAF50', // green
  cancelled: '#9E9E9E', // gray
};

const DEFAULT_STATUS_COLOR = '#757575'; // default gray

export class DashboardService {
  private teamMemberRepository: TeamMemberRepository;
  private taskRepository: TaskRepository;
  private sprintRepository: SprintRepository;
  private teamRepository: TeamRepository;
  private allocationRepository: TeamMemberAllocationRepository;
  private allocationService: TeamMemberAllocationService;
  private taskLocalPriorityRepository: TaskLocalPriorityRepository;

  constructor(
    teamMemberRepository?: TeamMemberRepository,
    taskRepository?: TaskRepository,
    sprintRepository?: SprintRepository,
    teamRepository?: TeamRepository,
    allocationRepository?: TeamMemberAllocationRepository,
    allocationService?: TeamMemberAllocationService,
    taskLocalPriorityRepository?: TaskLocalPriorityRepository,
  ) {
    this.teamMemberRepository =
      teamMemberRepository ?? new TeamMemberRepository();
    this.taskRepository = taskRepository ?? new TaskRepository();
    this.sprintRepository = sprintRepository ?? new SprintRepository();
    this.teamRepository = teamRepository ?? new TeamRepository();
    this.allocationRepository =
      allocationRepository ?? new TeamMemberAllocationRepository();
    this.allocationService =
      allocationService ?? new TeamMemberAllocationService();
    this.taskLocalPriorityRepository =
      taskLocalPriorityRepository ?? new TaskLocalPriorityRepository();
  }

  // Reserved for future use - suppress unused warning
  protected getTeamRepository(): TeamRepository {
    return this.teamRepository;
  }

  /**
   * Get complete dashboard summary with all metrics for the given period
   */
  async getSummary(period: DashboardPeriod): Promise<DashboardSummary> {
    void period; // Period parameter reserved for future filtering
    const [activeMembers, tasksInProgress] = await Promise.all([
      this.getActiveMembers(),
      this.getTasksInProgress(),
    ]);

    return {
      activeMembers,
      tasksInProgress,
      totalAllocations: 0,
      membersWithHighWorkload: [],
      membersWithoutAllocation: [],
    };
  }

  /**
   * Get count of active team members
   */
  async getActiveMembers(): Promise<number> {
    const activeMembers = await this.teamMemberRepository.findActive();
    return activeMembers.length;
  }

  /**
   * Get count of tasks with status 'in_progress'
   */
  async getTasksInProgress(): Promise<number> {
    const tasksInProgress =
      await this.taskRepository.findByStatus('in_progress');
    return tasksInProgress.length;
  }

  /**
   * Get team members with high workload - returns empty array (workload removed)
   */
  async getMembersWithHighWorkload(
    period: DashboardPeriod,
    threshold = 100,
  ): Promise<TeamMemberWorkload[]> {
    void period; // Period parameter reserved for future filtering
    void threshold; // Threshold parameter reserved for future filtering
    return [];
  }

  /**
   * Get team members with no allocations in the given period
   */
  async getMembersWithoutAllocation(
    period: DashboardPeriod,
  ): Promise<TeamMember[]> {
    void period; // Period parameter reserved for future filtering
    return [];
  }

  /**
   * Dashboard de Alocação: alocações ativas, membros sem alocação, conflitos, alocações por equipe.
   * Usa exclusivamente dados do Banco_Local.
   */
  async getAllocationDashboard(): Promise<AllocationDashboard> {
    const activeMembers = await this.teamMemberRepository.findActive();
    const activeAllocations = await this.allocationRepository.findWithFilters({
      isActive: true,
    });

    // Determine which members have active allocations
    const allocatedMemberIds = new Set(
      activeAllocations.map((a) => a.teamMemberId),
    );

    const membersWithoutAllocation = activeMembers
      .filter((m) => !allocatedMemberIds.has(m.id))
      .map((m) => this.mapTeamMemberToDto(m));

    // Detect allocation conflicts (member allocated to team X but has tasks in team Y)
    const allocationConflicts =
      await this.allocationService.detectAllocationConflicts();

    // Count allocations by team
    const teamCountMap = new Map<string, number>();
    for (const allocation of activeAllocations) {
      const teamName = allocation.team?.name ?? `Team ${allocation.teamId}`;
      teamCountMap.set(teamName, (teamCountMap.get(teamName) ?? 0) + 1);
    }
    const allocationsByTeam = Array.from(teamCountMap.entries()).map(
      ([teamName, count]) => ({ teamName, count }),
    );

    return {
      activeAllocations: activeAllocations.length,
      membersAllocated: allocatedMemberIds.size,
      membersWithoutAllocation,
      allocationConflicts,
      allocationsByTeam,
    };
  }

  /**
   * Dashboard de Gestão de Tarefas: total, por status, por tipo, por equipe, não atribuídas.
   * Usa exclusivamente dados do Banco_Local.
   */
  async getTaskManagementDashboard(): Promise<TaskManagementDashboard> {
    const allTasks = await this.taskRepository.findAllWithRelations();

    // Count by status
    const statusMap = new Map<string, number>();
    for (const task of allTasks) {
      const status = task.status ?? 'unknown';
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    }
    const tasksByStatus = Array.from(statusMap.entries()).map(
      ([status, count]) => ({ status, count }),
    );

    // Count by type
    const typeMap = new Map<string, number>();
    for (const task of allTasks) {
      const type = task.type ?? 'unknown';
      typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
    }
    const tasksByType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Count by team
    const teamMap = new Map<string, number>();
    for (const task of allTasks) {
      const teamName = task.team?.name ?? 'Sem equipe';
      teamMap.set(teamName, (teamMap.get(teamName) ?? 0) + 1);
    }
    const tasksByTeam = Array.from(teamMap.entries()).map(
      ([teamName, count]) => ({ teamName, count }),
    );

    // Count unassigned tasks
    const unassignedTasks = allTasks.filter(
      (t) => !t.assignedToName && !t.assignedToEmail,
    ).length;

    return {
      totalTasks: allTasks.length,
      tasksByStatus,
      tasksByType,
      tasksByTeam,
      unassignedTasks,
    };
  }

  /**
   * Dashboard de Sprints: sprints ativas, completadas, tarefas por sprint, velocity.
   * Usa exclusivamente dados do Banco_Local.
   */
  async getSprintDashboard(): Promise<SprintDashboard> {
    const now = new Date();
    const allSprints = await this.sprintRepository.findAll();

    // Active sprints: startDate <= now <= endDate and isActive
    const activeSprints = allSprints.filter(
      (s) => s.isActive && s.startDate <= now && s.endDate >= now,
    );

    // Completed sprints: endDate < now
    const completedSprints = allSprints.filter((s) => s.endDate < now);

    // Build SprintSummary for active sprints
    const activeSprintSummaries: SprintSummary[] = activeSprints.map((s) => {
      const tasks = s.tasks ?? [];
      const completedTasks = tasks.filter(
        (t) => t.status === 'completed',
      ).length;
      const totalStoryPoints = tasks.reduce(
        (sum, t) => sum + (t.storyPoints ?? 0),
        0,
      );
      return {
        id: s.id,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        totalTasks: tasks.length,
        completedTasks,
        totalStoryPoints,
      };
    });

    // Tasks by sprint (all sprints that have tasks)
    const tasksBySprint = allSprints
      .filter((s) => s.tasks && s.tasks.length > 0)
      .map((s) => {
        const tasks = s.tasks ?? [];
        return {
          sprintName: s.name,
          total: tasks.length,
          completed: tasks.filter((t) => t.status === 'completed').length,
        };
      });

    // Velocity: story points completed per sprint (completed sprints)
    const velocity = completedSprints.map((s) => {
      const tasks = s.tasks ?? [];
      const completedStoryPoints = tasks
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
      return {
        sprintName: s.name,
        storyPoints: completedStoryPoints,
      };
    });

    return {
      activeSprints: activeSprintSummaries,
      completedSprints: completedSprints.length,
      tasksBySprint,
      velocity,
    };
  }

  private mapTeamMemberToDto(entity: TeamMemberEntity): TeamMember {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // ============================================================================
  // Dashboard Sustentação Methods
  // ============================================================================

  /**
   * Get work items for the Sustentação dashboard.
   *
   * Property 1: Filters items where:
   * - type IN ('Ticket', 'Improvement')
   * - area_path LIKE 'Tribo SEIF\Sustentação\%'
   * - status NOT IN ('completed', 'cancelled')
   *
   * Property 4: Marks items as stale if (current_date - updatedAt) > staleDays
   *
   * Property 5: Orders by:
   * 1. Local priority DESC (higher first)
   * 2. updatedAt ASC (older first) for ties
   *
   * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 12.1
   *
   * @param options - Filtering and sorting options
   * @returns Array of SustentacaoItem with enriched data
   */
  async getSustentacaoItems(
    options: SustentacaoOptions = {},
  ): Promise<SustentacaoItem[]> {
    const { staleDays = 7 } = options;

    logger.debug('[DashboardService.getSustentacaoItems]', { options });

    // Get all tasks with relations
    const allTasks = await this.taskRepository.findAllWithRelations();

    // Property 1: Filter by type, area_path, and status
    const filteredTasks = allTasks.filter((task) => {
      // Check type IN ('Ticket', 'Improvement')
      const isValidType = SUSTENTACAO_WORK_ITEM_TYPES.includes(
        task.type ?? '',
      );

      // Check area_path LIKE 'Tribo SEIF\Sustentação\%'
      const isValidAreaPath =
        task.areaPath?.startsWith(SUSTENTACAO_AREA_PATH_PATTERN) ?? false;

      // Check status NOT IN ('completed', 'cancelled')
      const isOpen = !CLOSED_STATUSES.includes(task.status);

      return isValidType && isValidAreaPath && isOpen;
    });

    // Get external IDs for priority lookup
    const externalIds = filteredTasks
      .map((t) => t.externalId)
      .filter((id): id is string => id !== undefined && id !== null);

    // Get local priorities for all filtered tasks
    const priorityMap =
      await this.taskLocalPriorityRepository.findByExternalIds(externalIds);

    // Build SustentacaoItem array with enriched data
    const now = new Date();
    const items: SustentacaoItem[] = await Promise.all(
      filteredTasks.map(async (task) => {
        // Property 9: Default priority is 0 for items without defined priority
        const localPriority = task.externalId
          ? (priorityMap.get(task.externalId) ?? 0)
          : 0;

        // Property 4: Calculate days since update and stale status
        const daysSinceUpdate = this.calculateDaysSinceUpdate(
          task.updatedAt,
          now,
        );
        const isStale = daysSinceUpdate > staleDays;

        // Count children
        const childrenCount = await this.countChildrenForTask(task.id);

        return {
          task,
          localPriority,
          isStale,
          daysSinceUpdate,
          childrenCount,
        };
      }),
    );

    // Property 5: Sort by priority DESC, then updatedAt ASC
    items.sort((a, b) => {
      // First: priority DESC (higher first)
      if (a.localPriority !== b.localPriority) {
        return b.localPriority - a.localPriority;
      }
      // Second: updatedAt ASC (older first)
      const aTime = a.task.updatedAt?.getTime() ?? 0;
      const bTime = b.task.updatedAt?.getTime() ?? 0;
      return aTime - bTime;
    });

    return items;
  }

  /**
   * Get count of stale items in Sustentação dashboard.
   *
   * Property 4: An item is stale if (current_date - updatedAt) > staleDays
   *
   * Validates: Requirements 2.5, 2.8
   *
   * @param staleDays - Number of days to consider an item stale
   * @returns Count of stale items
   */
  async getStaleItemsCount(staleDays: number): Promise<number> {
    logger.debug('[DashboardService.getStaleItemsCount]', { staleDays });

    const items = await this.getSustentacaoItems({ staleDays });
    return items.filter((item) => item.isStale).length;
  }

  // ============================================================================
  // Dashboard Projetos Methods
  // ============================================================================

  /**
   * Get work items for the Projetos dashboard filtered by Sprint.
   *
   * Property 2: Filters items where:
   * - area_path LIKE 'Tribo SEIF\Projetos\%'
   * - sprint_id = selected Sprint
   *
   * Validates: Requirements 5.1, 5.3, 12.2
   *
   * @param sprintId - The Sprint ID to filter by
   * @returns Array of ProjetosItem with enriched data
   */
  async getProjetosItems(sprintId: number): Promise<ProjetosItem[]> {
    logger.debug('[DashboardService.getProjetosItems]', { sprintId });

    // Get tasks for the specified sprint
    const sprintTasks = await this.taskRepository.findBySprint(sprintId);

    // Property 2: Filter by area_path LIKE 'Tribo SEIF\Projetos\%'
    const filteredTasks = sprintTasks.filter((task) => {
      return task.areaPath?.startsWith(PROJETOS_AREA_PATH_PATTERN) ?? false;
    });

    // Get external IDs for priority lookup
    const externalIds = filteredTasks
      .map((t) => t.externalId)
      .filter((id): id is string => id !== undefined && id !== null);

    // Get local priorities
    const priorityMap =
      await this.taskLocalPriorityRepository.findByExternalIds(externalIds);

    // Build ProjetosItem array with enriched data
    const items: ProjetosItem[] = await Promise.all(
      filteredTasks.map(async (task) => {
        const localPriority = task.externalId
          ? (priorityMap.get(task.externalId) ?? 0)
          : 0;

        // Get children and calculate progress
        const children = await this.taskRepository.findByParentId(task.id);
        const childrenCount = children.length;
        const completedChildrenCount = children.filter((child) =>
          COMPLETED_STATUSES.includes(child.status),
        ).length;

        // Property 10: Progress = (completed / total) * 100, or 0 if no children
        const progressPercent =
          childrenCount > 0
            ? Math.round((completedChildrenCount / childrenCount) * 100)
            : 0;

        return {
          task,
          localPriority,
          childrenCount,
          completedChildrenCount,
          progressPercent,
        };
      }),
    );

    return items;
  }

  /**
   * Get User Stories with progress calculation for a Sprint.
   *
   * Property 10: Progress = (completedChildren / totalChildren) * 100
   * If totalChildren = 0, progress = 0
   *
   * Property 11: A User Story is complete if all children have completed status
   *
   * Validates: Requirements 5.7, 5.8
   *
   * @param sprintId - The Sprint ID to filter by
   * @returns Array of UserStoryProgress with progress data
   */
  async getUserStoriesWithProgress(
    sprintId: number,
  ): Promise<UserStoryProgress[]> {
    logger.debug('[DashboardService.getUserStoriesWithProgress]', { sprintId });

    // Get tasks for the specified sprint
    const sprintTasks = await this.taskRepository.findBySprint(sprintId);

    // Filter to User Stories only (area_path Projetos and type User Story)
    const userStories = sprintTasks.filter((task) => {
      const isUserStory = task.type === 'User Story';
      const isProjetosArea =
        task.areaPath?.startsWith(PROJETOS_AREA_PATH_PATTERN) ?? false;
      return isUserStory && isProjetosArea;
    });

    // Build UserStoryProgress array
    const items: UserStoryProgress[] = await Promise.all(
      userStories.map(async (task) => {
        // Get children (Tasks)
        const children = await this.taskRepository.findByParentId(task.id);
        const totalChildren = children.length;
        const completedChildren = children.filter((child) =>
          COMPLETED_STATUSES.includes(child.status),
        ).length;

        // Property 10: Progress calculation
        const progressPercent =
          totalChildren > 0
            ? Math.round((completedChildren / totalChildren) * 100)
            : 0;

        // Property 11: Complete if all children are completed
        const isComplete =
          totalChildren > 0 && completedChildren === totalChildren;

        return {
          task,
          totalChildren,
          completedChildren,
          progressPercent,
          isComplete,
        };
      }),
    );

    return items;
  }

  // ============================================================================
  // Chart Methods
  // ============================================================================

  /**
   * Get burndown data for a Sprint.
   *
   * Property 41: For each day in the Sprint:
   * - planned: total items in the Sprint
   * - completed: items with status 'Done' or 'Closed' and updatedAt <= date
   *
   * Validates: Requirements 19.1, 19.9
   *
   * @param sprintId - The Sprint ID to get burndown data for
   * @returns Array of BurndownPoint for each day in the Sprint
   */
  async getBurndownData(sprintId: number): Promise<BurndownPoint[]> {
    logger.debug('[DashboardService.getBurndownData]', { sprintId });

    // Get the sprint with its tasks
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      logger.warning('[DashboardService.getBurndownData] Sprint not found', {
        sprintId,
      });
      return [];
    }

    const tasks = sprint.tasks ?? [];
    const totalPlanned = tasks.length;

    // Generate date range from sprint start to end (or today if sprint is ongoing)
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();
    const effectiveEndDate = endDate < today ? endDate : today;

    const burndownPoints: BurndownPoint[] = [];

    // Iterate through each day in the sprint
    const currentDate = new Date(startDate);
    while (currentDate <= effectiveEndDate) {
      // Property 41: Count completed items where updatedAt <= currentDate
      const completedCount = tasks.filter((task) => {
        const isCompleted = COMPLETED_STATUSES.includes(task.status);
        const updatedAt = task.updatedAt ? new Date(task.updatedAt) : null;
        // Item is completed if it has a completed status and was updated on or before this date
        return isCompleted && updatedAt && updatedAt <= currentDate;
      }).length;

      burndownPoints.push({
        date: new Date(currentDate),
        planned: totalPlanned,
        completed: completedCount,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return burndownPoints;
  }

  /**
   * Get status distribution for pie chart.
   *
   * Property 42: For any context (Sprint or parent item), shows correct count per status.
   *
   * Validates: Requirements 19.2
   *
   * @param parentId - Optional parent ID to filter children only
   * @returns Array of StatusCount with status, count, and color
   */
  async getStatusDistribution(parentId?: number): Promise<StatusCount[]> {
    logger.debug('[DashboardService.getStatusDistribution]', { parentId });

    let tasks: TaskEntity[];

    if (parentId !== undefined) {
      // Property 45: Filter by parent_id when in drill-down context
      tasks = await this.taskRepository.findByParentId(parentId);
    } else {
      // Get all tasks
      tasks = await this.taskRepository.findAllWithRelations();
    }

    // Count by status
    const statusMap = new Map<string, number>();
    for (const task of tasks) {
      const status = task.status ?? 'unknown';
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    }

    // Convert to StatusCount array with colors
    const statusCounts: StatusCount[] = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
        color: STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR,
      }),
    );

    // Sort by count descending
    statusCounts.sort((a, b) => b.count - a.count);

    return statusCounts;
  }

  /**
   * Get assignee distribution for bar chart.
   *
   * Property 43: For any context (Sprint or parent item), shows correct count per assignee.
   *
   * Validates: Requirements 19.3
   *
   * @param parentId - Optional parent ID to filter children only
   * @returns Array of AssigneeCount with assignee name and count
   */
  async getAssigneeDistribution(parentId?: number): Promise<AssigneeCount[]> {
    logger.debug('[DashboardService.getAssigneeDistribution]', { parentId });

    let tasks: TaskEntity[];

    if (parentId !== undefined) {
      // Property 45: Filter by parent_id when in drill-down context
      tasks = await this.taskRepository.findByParentId(parentId);
    } else {
      // Get all tasks
      tasks = await this.taskRepository.findAllWithRelations();
    }

    // Count by assignee
    const assigneeMap = new Map<string, number>();
    for (const task of tasks) {
      const assignee = task.assignedToName ?? 'Não atribuído';
      assigneeMap.set(assignee, (assigneeMap.get(assignee) ?? 0) + 1);
    }

    // Convert to AssigneeCount array
    const assigneeCounts: AssigneeCount[] = Array.from(
      assigneeMap.entries(),
    ).map(([assignee, count]) => ({
      assignee,
      count,
    }));

    // Sort by count descending
    assigneeCounts.sort((a, b) => b.count - a.count);

    return assigneeCounts;
  }

  /**
   * Get hierarchy progress for a parent item.
   *
   * Property 44: Shows proportion of completed children vs total children.
   *
   * Validates: Requirements 19.4
   *
   * @param parentId - The parent item ID to get progress for
   * @returns HierarchyProgress with parent info and progress data
   */
  async getHierarchyProgress(parentId: number): Promise<HierarchyProgress> {
    logger.debug('[DashboardService.getHierarchyProgress]', { parentId });

    // Get the parent task
    const parentTask = await this.taskRepository.findOneBy({ id: parentId });
    if (!parentTask) {
      logger.warning(
        '[DashboardService.getHierarchyProgress] Parent not found',
        {
          parentId,
        },
      );
      return {
        parentId,
        parentTitle: 'Unknown',
        totalChildren: 0,
        completedChildren: 0,
        progressPercent: 0,
      };
    }

    // Get children
    const children = await this.taskRepository.findByParentId(parentId);
    const totalChildren = children.length;
    const completedChildren = children.filter((child) =>
      COMPLETED_STATUSES.includes(child.status),
    ).length;

    // Property 44: Calculate progress percentage
    const progressPercent =
      totalChildren > 0
        ? Math.round((completedChildren / totalChildren) * 100)
        : 0;

    return {
      parentId,
      parentTitle: parentTask.title,
      totalChildren,
      completedChildren,
      progressPercent,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate the number of days since a date.
   *
   * @param date - The date to calculate from
   * @param now - The current date (for testing purposes)
   * @returns Number of days since the date
   */
  private calculateDaysSinceUpdate(
    date: Date | undefined,
    now: Date = new Date(),
  ): number {
    if (!date) {
      return 0;
    }
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Count children for a task.
   *
   * @param taskId - The task ID to count children for
   * @returns Number of children
   */
  private async countChildrenForTask(taskId: number): Promise<number> {
    const children = await this.taskRepository.findByParentId(taskId);
    return children.length;
  }
}
