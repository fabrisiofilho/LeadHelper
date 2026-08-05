import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';
import { SprintRepository } from '../repositories/sprint-repository';
import { TeamRepository } from '../repositories/team-repository';
import { TeamMemberAllocationRepository } from '../repositories/team-member-allocation-repository';
import { TeamMemberAllocationService } from './team-member-allocation-service';
import { TaskLocalPriorityRepository } from '../repositories/task-local-priority-repository';
import { TaskUpdateRepository } from '../repositories/task-update-repository';
import {
  AzureDevOpsService,
  DEFAULT_SUSTENTACAO_AREA_PATH,
  DEFAULT_PROJETOS_AREA_PATH,
} from './azure-devops-service';
import { SlaConfigService } from './sla-config-service';
import { TeamMemberEntity } from '../entities/team-member.entity';
import { TaskEntity } from '../entities/task.entity';
import { SprintEntity } from '../entities/sprint.entity';
import type { AllocationConflict } from './team-member-allocation-service';
import { logger } from '@main/infrastructure/log/logger';
import {
  calculateBusinessHours,
  isBusinessDay,
  startOfNextBusinessDay,
} from '@main/infrastructure/utils/business-hours';
import {
  SLA_LIMITS,
  type TaskPriority,
} from '@shared/interfaces/config/index.types';
import { getStatusColor as _getStatusColor } from '@shared/constants/status-colors';

import { TaskSlaExclusionRepository } from '../repositories/task-sla-exclusion-repository';
import { TaskHiddenRepository } from '../repositories/task-hidden-repository';
import { NoteCardRepository } from '../repositories/note-card-repository';

export interface DashboardPeriod {
  startDate: Date;
  endDate: Date;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: import('@shared/interfaces/config/index.types').TeamMemberRole;
  isActive: boolean;
  positionId?: number;
  position?: {
    id: number;
    name: string;
    description?: string;
    allowedStatuses?: string;
    isActive: boolean;
  };
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
 * Extends SustentacaoItem with SLA calculation fields.
 * Used by the Sustentação dashboard to display SLA status indicators.
 */
export interface SustentacaoItemWithSLA extends SustentacaoItem {
  businessHoursElapsed: number;
  slaLimit: number;
  slaPercentage: number;
  slaViolated: boolean;
  slaWarning: boolean;
  expirationDate: string | null;
  businessHoursRemaining: number;
  daysUntilExpiration: number;
  expirationAlert: 'expired' | 'critical' | 'warning' | 'attention' | null;
  slaExcluded?: boolean;
  isHidden?: boolean;
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
 * Alert for sprint items that are pending (no progress) or stagnant (no update in 2+ business days)
 * when there are ≤5 business days remaining until sprint end.
 *
 * Validates: Requirements 3.4, 3.5
 */
export interface SprintAlert {
  type: 'pending_no_progress' | 'stagnant';
  taskId: number;
  externalId?: string;
  taskTitle: string;
  message: string;
  parentExternalId?: string;
  parentTitle?: string;
}

/**
 * Quantitative summary of a sprint's cards grouped by status.
 * Property 8: total = pending + inProgress + completed + cancelled
 * and completionPercentage = (completed / total) * 100 (or 0 if total = 0).
 *
 * Validates: Requirements 3.3, 3.6
 */
export interface SprintQuantitativeSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
  completionPercentage: number;
}

/**
 * Result of getProjetosItems: items grouped by status + quantitative summary + alerts.
 *
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6
 */
export interface ProjetosResult {
  items: ProjetosItem[];
  groupedByStatus: {
    pending: ProjetosItem[];
    inProgress: ProjetosItem[];
    completed: ProjetosItem[];
    cancelled: ProjetosItem[];
  };
  summary: SprintQuantitativeSummary;
  alerts: SprintAlert[];
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
 * @deprecated Use getAreaPaths(configId) which reads from DB with fallback.
 */
const SUSTENTACAO_AREA_PATH_PATTERN = DEFAULT_SUSTENTACAO_AREA_PATH;
const PROJETOS_AREA_PATH_PATTERN = DEFAULT_PROJETOS_AREA_PATH;

/**
 * Valid work item types for Sustentação dashboard.
 * Property 1: type IN ('Ticket', 'Improvement')
 */
const SUSTENTACAO_WORK_ITEM_TYPES = ['Ticket', 'Improvement'];

/**
 * Statuses that indicate a work item is closed/completed.
 * Includes both legacy mapped values and real Azure DevOps states.
 * Property 1: status NOT IN closed/cancelled
 */
const CLOSED_STATUSES = [
  'completed',
  'cancelled',
  'Done',
  'Closed',
  'Resolved',
  'Finalizado',
  'Removed',
  'Cut',
  'Cancelado',
];

/**
 * Statuses that indicate a task is completed for progress calculation.
 * Property 10, 11: Tasks with these statuses are considered completed.
 */
const COMPLETED_STATUSES = [
  'completed',
  'Done',
  'Closed',
  'Resolved',
  'Finalizado',
];

/**
 * Statuses that indicate a task is cancelled.
 */
const CANCELLED_STATUSES = ['cancelled', 'Removed', 'Cut', 'Cancelado'];

/**
 * Statuses that indicate a task is in progress.
 */
const IN_PROGRESS_STATUSES = [
  'in_progress',
  'Active',
  'In Progress',
  'Committed',
  'Em Andamento',
  'Em Desenvolvimento',
  'Em Auditoria',
  'Em Homologação',
  'Aguardando Auditoria',
  'Aguardando Validação',
  'Aguardando Implantação',
  'Aguardando Homologação',
  'Em Implantação',
  'Em validação',
  'Em classificação',
  'Preparando para Dev',
  'Aguardando desenvolvimento',
];

/**
 * Statuses that indicate a task is pending (not yet started).
 * @deprecated Currently unused — kept for future filtering logic
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PENDING_STATUSES = [
  'pending',
  'New',
  'Novo',
  'Em Levantamento',
  'Em levantamento',
  'Backlog Comprometido',
];

/**
 * Categorize a task status string into one of the four canonical groups.
 * Falls back to 'pending' for unknown statuses.
 */
export function categorizeStatus(
  status: string,
): 'pending' | 'inProgress' | 'completed' | 'cancelled' {
  if (COMPLETED_STATUSES.includes(status)) return 'completed';
  if (CANCELLED_STATUSES.includes(status)) return 'cancelled';
  if (IN_PROGRESS_STATUSES.includes(status)) return 'inProgress';
  return 'pending';
}

/**
 * Color mapping for status badges.
 * Property 36: Centralized in @shared/constants/status-colors
 */
const STATUS_COLORS_LOOKUP = _getStatusColor;

/**
 * Pure function to find the current sprint from a list of sprints for a given reference date.
 *
 * Property 7: For any set of sprints and any reference date, the current sprint is the one
 * whose startDate <= referenceDate and endDate >= referenceDate. If multiple sprints satisfy
 * the condition for the same team, the most recent (by startDate) should be selected.
 * If none satisfies, the result should be null.
 *
 * Validates: Requirements 3.2
 *
 * @param sprints - Array of sprint-like objects with startDate, endDate, and optional teamId
 * @param referenceDate - The date to check against
 * @param teamId - Optional team ID to filter sprints by
 * @returns The current sprint or null
 */
export function findCurrentSprint<
  T extends { startDate: Date; endDate: Date; teamId?: number },
>(sprints: T[], referenceDate: Date, teamId?: number): T | null {
  const candidates = sprints.filter((s) => {
    const matchesTeam = teamId === undefined || s.teamId === teamId;
    const matchesDate =
      s.startDate <= referenceDate && s.endDate >= referenceDate;
    return matchesTeam && matchesDate;
  });

  if (candidates.length === 0) return null;

  // Select the most recent by startDate (descending)
  candidates.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return candidates[0];
}

/**
 * Calculate the number of business days remaining from a reference date to a target date.
 * Counts only weekdays (Mon–Fri). The reference date itself is not counted if it's already
 * past business hours, but for simplicity we count full days from the day after referenceDate
 * up to and including targetDate.
 *
 * Validates: Requirements 3.4, 3.5
 *
 * @param referenceDate - The starting date (typically "today")
 * @param targetDate - The end date (typically sprint endDate)
 * @returns Number of business days remaining (0 if targetDate <= referenceDate)
 */
export function calculateBusinessDaysRemaining(
  referenceDate: Date,
  targetDate: Date,
): number {
  // Normalize to start of day for comparison
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(targetDate);
  end.setHours(0, 0, 0, 0);

  if (end <= start) return 0;

  let count = 0;
  const current = new Date(start);
  // Move to the next day and start counting
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calculate the number of business days since a given date.
 *
 * Validates: Requirements 3.5
 *
 * @param fromDate - The date to count from
 * @param referenceDate - The current date (typically "today")
 * @returns Number of business days elapsed
 */
export function calculateBusinessDaysSince(
  fromDate: Date,
  referenceDate: Date,
): number {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);

  if (end <= start) return 0;

  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Represents a Sustentação team member with their in-progress cards.
 * Used by the Sustentação dashboard to display members and their workload.
 *
 * Validates: Requirements 2.2, 2.3, 2.4
 */
export interface SustentacaoMemberWithCards {
  member: TeamMemberEntity;
  inProgressCards: SustentacaoItemWithSLA[];
  hasNoCards: boolean;
}

export class DashboardService {
  private teamMemberRepository: TeamMemberRepository;
  private taskRepository: TaskRepository;
  private sprintRepository: SprintRepository;
  private teamRepository: TeamRepository;
  private allocationRepository: TeamMemberAllocationRepository;
  private allocationService: TeamMemberAllocationService;
  private taskLocalPriorityRepository: TaskLocalPriorityRepository;
  private taskUpdateRepository: TaskUpdateRepository;
  private slaExclusionRepository: TaskSlaExclusionRepository;
  private hiddenRepository: TaskHiddenRepository;
  private noteCardRepository: NoteCardRepository;
  private azureDevOpsService: AzureDevOpsService;
  private slaConfigService: SlaConfigService;

  // Short-lived cache for getSustentacaoItems (avoids double calculation when metrics are fetched right after items)
  private _sustentacaoCache: {
    data: SustentacaoItemWithSLA[];
    ts: number;
    configId?: number;
  } | null = null;
  private static readonly CACHE_TTL_MS = 5_000; // 5 seconds

  constructor(
    teamMemberRepository?: TeamMemberRepository,
    taskRepository?: TaskRepository,
    sprintRepository?: SprintRepository,
    teamRepository?: TeamRepository,
    allocationRepository?: TeamMemberAllocationRepository,
    allocationService?: TeamMemberAllocationService,
    taskLocalPriorityRepository?: TaskLocalPriorityRepository,
    taskUpdateRepository?: TaskUpdateRepository,
    slaExclusionRepository?: TaskSlaExclusionRepository,
    hiddenRepository?: TaskHiddenRepository,
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
    this.taskUpdateRepository =
      taskUpdateRepository ?? new TaskUpdateRepository();
    this.slaExclusionRepository =
      slaExclusionRepository ?? new TaskSlaExclusionRepository();
    this.hiddenRepository = hiddenRepository ?? new TaskHiddenRepository();
    this.noteCardRepository = new NoteCardRepository();
    this.azureDevOpsService = new AzureDevOpsService();
    this.slaConfigService = new SlaConfigService();
  }

  /**
   * Gets the configured area path prefix for Sustentação for the given project,
   * falling back to the default value when not configured.
   */
  private async getSustentacaoAreaPath(configId?: number): Promise<string> {
    if (!configId) return SUSTENTACAO_AREA_PATH_PATTERN;
    try {
      const config = await this.azureDevOpsService.getConfig(false, configId);
      return config?.sustentacaoAreaPath || SUSTENTACAO_AREA_PATH_PATTERN;
    } catch {
      return SUSTENTACAO_AREA_PATH_PATTERN;
    }
  }

  /**
   * Gets the configured area path prefix for Projetos for the given project,
   * falling back to the default value when not configured.
   */
  private async getProjetosAreaPath(configId?: number): Promise<string> {
    if (!configId) return PROJETOS_AREA_PATH_PATTERN;
    try {
      const config = await this.azureDevOpsService.getConfig(false, configId);
      return config?.projetosAreaPath || PROJETOS_AREA_PATH_PATTERN;
    } catch {
      return PROJETOS_AREA_PATH_PATTERN;
    }
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
      positionId: entity.positionId,
      position: entity.position
        ? {
            id: entity.position.id,
            name: entity.position.name,
            description: entity.position.description,
            allowedStatuses: entity.position.allowedStatuses,
            isActive: entity.position.isActive,
          }
        : undefined,
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
    configId?: number,
  ): Promise<SustentacaoItemWithSLA[]> {
    const { staleDays = 7 } = options;

    // Return cached result if fresh AND same configId
    if (
      this._sustentacaoCache &&
      this._sustentacaoCache.configId === configId &&
      Date.now() - this._sustentacaoCache.ts < DashboardService.CACHE_TTL_MS
    ) {
      logger.debug(
        '[DashboardService.getSustentacaoItems] returning cached result',
      );
      return this._sustentacaoCache.data;
    }

    logger.debug('[DashboardService.getSustentacaoItems]', {
      options,
      configId,
    });

    const areaPattern = await this.getSustentacaoAreaPath(configId);

    // Get filtered tasks directly from DB (avoids loading all tasks)
    const filteredTasks = configId
      ? await this.taskRepository.findOpenByConfigAndArea(
          configId,
          areaPattern,
          SUSTENTACAO_WORK_ITEM_TYPES,
          CLOSED_STATUSES,
        )
      : await this.taskRepository.findOpenByAreaAndTypes(
          areaPattern,
          SUSTENTACAO_WORK_ITEM_TYPES,
          CLOSED_STATUSES,
        );

    // Get external IDs for priority lookup
    const externalIds = filteredTasks
      .map((t) => t.externalId)
      .filter((id): id is string => id !== undefined && id !== null);

    // Fetch all independent data in parallel (includes SLA limits if configId provided)
    const [priorityMap, slaExclusions, hiddenItems, slaLimitsMap] =
      await Promise.all([
        this.taskLocalPriorityRepository.findByExternalIds(externalIds),
        this.slaExclusionRepository.findByExternalIds(externalIds),
        this.hiddenRepository.findByExternalIds(externalIds),
        configId
          ? this.slaConfigService.getLimitsMap(configId)
          : Promise.resolve(null as null),
      ]);

    // Get active prioritization notes to calculate local priority SLA
    // Build a map: taskInternalId -> { deadline, createdAt, localPriority }
    const prioNoteMap = new Map<
      number,
      { deadline?: Date; createdAt: Date; localPriority: number }
    >();
    try {
      const activeNotes = await this.noteCardRepository.findAllActive();
      for (const note of activeNotes) {
        if (!note.title.startsWith('Priorização #')) continue;
        const taskLinks = (note.links ?? []).filter(
          (l) => l.entityType === 'task',
        );
        for (const link of taskLinks) {
          // Find the localPriority for this task
          const task = filteredTasks.find((t) => t.id === link.entityId);
          if (!task?.externalId) continue;
          const lp = priorityMap.get(task.externalId) ?? 0;
          if (lp > 0) {
            prioNoteMap.set(link.entityId, {
              deadline: note.deadline ?? undefined,
              createdAt: note.createdAt ?? new Date(),
              localPriority: lp,
            });
          }
        }
      }
    } catch (error) {
      logger.warning(
        'Failed to load prioritization notes for SLA calculation',
        error,
      );
    }

    const now = new Date();
    const HOURS_PER_DAY = 8;

    const items: SustentacaoItemWithSLA[] = filteredTasks.map((task) => {
      const localPriority = task.externalId
        ? (priorityMap.get(task.externalId) ?? 0)
        : 0;

      const daysSinceUpdate = this.calculateDaysSinceUpdate(
        task.updatedAt,
        now,
      );
      const isStale = daysSinceUpdate > staleDays;
      const childrenCount = task.children?.length ?? 0;

      // SLA applies only to Ticket, not Improvement, not excluded, AND only when endDate is set
      const isTicket = task.type === 'Ticket';
      const isSlaExcluded = task.externalId
        ? slaExclusions.has(task.externalId)
        : false;
      const isHidden = task.externalId
        ? hiddenItems.has(task.externalId)
        : false;
      // No endDate → no SLA (no limit defined by the support team)
      const hasDeadline = !!task.endDate;
      const applySla = isTicket && !isSlaExcluded && hasDeadline;

      // SLA deadline is the task's endDate (TÉRMINO set in Azure)
      const slaDeadline = task.endDate ? new Date(task.endDate) : null;

      // Start of counting: next business day after azure creation
      const rawSlaStartDate =
        task.azureCreatedDate ?? task.startDate ?? task.createdAt;
      const slaStartDate = rawSlaStartDate
        ? startOfNextBusinessDay(rawSlaStartDate)
        : undefined;

      const taskPriority = task.priority as TaskPriority;

      // slaLimit is kept for reference / metrics but no longer drives the deadline
      let slaLimit = 0;
      if (applySla) {
        if (slaLimitsMap) {
          const subArea = this.classifySubArea(task.areaPath, areaPattern);
          slaLimit =
            slaLimitsMap.get(`${subArea}:${taskPriority}`) ??
            SLA_LIMITS[taskPriority] ??
            SLA_LIMITS.medium;
        } else {
          slaLimit = SLA_LIMITS[taskPriority] ?? SLA_LIMITS.medium;
        }
      }

      // Elapsed: business hours from SLA start until now
      let businessHoursElapsed = 0;
      if (applySla && slaStartDate) {
        businessHoursElapsed = calculateBusinessHours(slaStartDate, now);
      }

      // Violated: current time is past the deadline
      const slaViolated = applySla && slaDeadline != null && now > slaDeadline;

      // Remaining: positive = hours left, negative = hours overdue
      let businessHoursRemaining = 0;
      if (applySla && slaDeadline != null) {
        if (slaViolated) {
          businessHoursRemaining = -calculateBusinessHours(slaDeadline, now);
        } else {
          businessHoursRemaining = calculateBusinessHours(now, slaDeadline);
        }
      }

      // Total window for percentage calculation (start → deadline)
      const totalWindow =
        applySla && slaStartDate && slaDeadline
          ? calculateBusinessHours(slaStartDate, slaDeadline)
          : 0;
      const slaPercentage =
        totalWindow > 0 ? (businessHoursElapsed / totalWindow) * 100 : 0;
      const slaWarning = applySla && !slaViolated && slaPercentage >= 80;

      const daysUntilExpiration = businessHoursRemaining / HOURS_PER_DAY;

      // expirationDate is the endDate itself
      const expirationDate: string | null = slaDeadline
        ? slaDeadline.toISOString()
        : null;

      let expirationAlert:
        | 'expired'
        | 'critical'
        | 'warning'
        | 'attention'
        | null = null;
      if (applySla) {
        if (slaViolated) {
          expirationAlert = 'expired';
        } else if (daysUntilExpiration <= 1) {
          expirationAlert = 'critical';
        } else if (daysUntilExpiration <= 2) {
          expirationAlert = 'warning';
        } else if (daysUntilExpiration <= 3) {
          expirationAlert = 'attention';
        }
      }

      // Local priority SLA calculation
      // If deadline is set: remaining = deadline - now
      // If no deadline: remaining = priorityHours - elapsed since note creation
      const PRIO_HOURS: Record<number, number> = {
        4: 4,
        3: 8,
        2: 24,
        1: 40,
      };
      const prioNote = prioNoteMap.get(task.id);
      let localPriorityDeadline: string | null = null;
      let localPriorityCreatedAt: string | null = null;
      let localPriorityHoursRemaining: number | null = null;
      let localPriorityExpired = false;

      if (prioNote && localPriority > 0) {
        localPriorityCreatedAt = prioNote.createdAt.toISOString();
        if (prioNote.deadline) {
          // Deadline-based: calculate hours remaining until deadline
          localPriorityDeadline = prioNote.deadline.toISOString();
          const hoursToDeadline = calculateBusinessHours(
            now,
            prioNote.deadline,
          );
          // If deadline is in the past, hoursToDeadline will be 0 or we need to negate
          if (prioNote.deadline <= now) {
            const overdue = calculateBusinessHours(prioNote.deadline, now);
            localPriorityHoursRemaining = -overdue;
            localPriorityExpired = true;
          } else {
            localPriorityHoursRemaining = hoursToDeadline;
            localPriorityExpired = false;
          }
        } else {
          // Priority-based: createdAt + priorityHours
          const prioLimit = PRIO_HOURS[localPriority] ?? 24;
          const elapsed = calculateBusinessHours(prioNote.createdAt, now);
          localPriorityHoursRemaining = prioLimit - elapsed;
          localPriorityExpired = localPriorityHoursRemaining <= 0;
        }
      }

      return {
        task,
        localPriority,
        isStale,
        daysSinceUpdate,
        childrenCount,
        businessHoursElapsed,
        slaLimit,
        slaPercentage,
        slaViolated,
        slaWarning,
        expirationDate,
        businessHoursRemaining,
        daysUntilExpiration,
        expirationAlert,
        slaExcluded: isSlaExcluded,
        isHidden,
        localPriorityDeadline,
        localPriorityCreatedAt,
        localPriorityHoursRemaining,
        localPriorityExpired,
      };
    });

    // Canonical sort for Sustentação items:
    // 1. Violated SLA first (past deadline), most overdue first
    // 2. Has any effective deadline (expiration OR local priority) → earliest first
    // 3. No deadline → Ticket > Improvement, Gestão > Chamada
    // 4. Azure priority tiebreak, then staleness
    // NOTE: Blocked items are NOT sinked — impedimento label is shown inline.
    //       Unallocated items have the same position rules — the copy layer separates them.
    const effectiveDeadlineMs = (item: SustentacaoItemWithSLA): number => {
      if (item.expirationDate) return new Date(item.expirationDate).getTime();
      if (item.localPriorityDeadline)
        return new Date(item.localPriorityDeadline).getTime();
      if (item.localPriorityCreatedAt)
        return new Date(item.localPriorityCreatedAt).getTime();
      return Infinity;
    };

    const typeAreaW = (item: SustentacaoItemWithSLA): number => {
      const gt = item.task.areaPath?.includes('Gestão de Terceiros') ?? false;
      const isTicket = item.task.type === 'Ticket';
      if (isTicket && gt) return 0;
      if (isTicket && !gt) return 1;
      if (!isTicket && gt) return 2;
      return 3;
    };

    items.sort((a, b) => {
      const aViolated = a.slaViolated ? 1 : 0;
      const bViolated = b.slaViolated ? 1 : 0;

      // 1. Violated SLA top
      if (aViolated !== bViolated) return bViolated - aViolated;
      if (aViolated && bViolated)
        return a.businessHoursRemaining - b.businessHoursRemaining;

      // 2. Effective deadline ASC
      const aDeadline = effectiveDeadlineMs(a);
      const bDeadline = effectiveDeadlineMs(b);
      const aHasDeadline = aDeadline !== Infinity ? 1 : 0;
      const bHasDeadline = bDeadline !== Infinity ? 1 : 0;

      if (aHasDeadline !== bHasDeadline) return bHasDeadline - aHasDeadline;
      if (aHasDeadline && bHasDeadline) {
        const diff = aDeadline - bDeadline;
        if (diff !== 0) return diff;
      }

      // 3. Type × Area weight (Ticket GT=0, Improvement GT=1, Ticket CT=2, Improvement CT=3)
      const wa = typeAreaW(a);
      const wb = typeAreaW(b);
      if (wa !== wb) return wa - wb;

      // 4. Azure priority level
      const priorityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      const aPrio = priorityOrder[a.task.priority] ?? 99;
      const bPrio = priorityOrder[b.task.priority] ?? 99;
      if (aPrio !== bPrio) return aPrio - bPrio;

      // 5. Staleness tiebreak
      return b.daysSinceUpdate - a.daysSinceUpdate;
    });

    this._sustentacaoCache = { data: items, ts: Date.now(), configId };
    return items;
  }

  /**
   * Invalidate the Sustentação items cache.
   * Should be called when local priority, SLA exclusion, or hidden status changes.
   */
  invalidateSustentacaoCache(): void {
    this._sustentacaoCache = null;
    logger.debug('[DashboardService] Sustentação cache invalidated');
  }

  /**
   * Get Sustentação team members with their in-progress cards.
   *
   * For each member allocated to a Sustentação team, finds their in-progress
   * cards (status = 'in_progress') with areaPath starting with "Tribo SEIF\Sustentação".
   * Returns a list of members with their cards and SLA information.
   *
   * Validates: Requirements 2.2, 2.3, 2.4
   *
   * @returns Array of SustentacaoMemberWithCards
   */
  async getSustentacaoMembersWithCards(
    configId?: number,
  ): Promise<SustentacaoMemberWithCards[]> {
    logger.debug('[DashboardService.getSustentacaoMembersWithCards]', {
      configId,
    });

    // 1. Get all open Sustentação items with SLA (not just in_progress)
    const allSustentacaoItems = await this.getSustentacaoItems({}, configId);

    // 2. Group cards by assignedTo (name or email) — no allocation needed
    const memberCardMap = new Map<
      string,
      {
        name: string;
        email?: string;
        cards: SustentacaoItemWithSLA[];
      }
    >();

    for (const item of allSustentacaoItems) {
      const assignedName = item.task.assignedToName;
      const assignedEmail = item.task.assignedToEmail;
      const key = assignedEmail || assignedName || 'Não atribuído';

      if (!memberCardMap.has(key)) {
        memberCardMap.set(key, {
          name: assignedName || key,
          email: assignedEmail,
          cards: [],
        });
      }
      memberCardMap.get(key)!.cards.push(item);
    }

    // 3. Build result — create a lightweight member representation from assignedTo
    // Collect all emails for a single batch query
    const allEmails = [...memberCardMap.values()]
      .map((d) => d.email)
      .filter((e): e is string => !!e);
    const memberEntityMap =
      await this.teamMemberRepository.findByEmails(allEmails);

    const result: SustentacaoMemberWithCards[] = [];
    for (const [, data] of memberCardMap) {
      // Try to find a real TeamMemberEntity by email
      const memberEntity = data.email
        ? (memberEntityMap.get(data.email.toLowerCase()) ?? null)
        : null;

      const member: TeamMemberEntity =
        memberEntity ??
        ({
          id: 0,
          name: data.name,
          email: data.email ?? '',
          role: 'developer',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TeamMemberEntity);

      // Canonical sort — same rules as getSustentacaoItems
      const effDeadlineMs = (item: SustentacaoItemWithSLA): number => {
        if (item.expirationDate) return new Date(item.expirationDate).getTime();
        if (item.localPriorityDeadline)
          return new Date(item.localPriorityDeadline).getTime();
        if (item.localPriorityCreatedAt)
          return new Date(item.localPriorityCreatedAt).getTime();
        return Infinity;
      };
      const typeAreaWCard = (item: SustentacaoItemWithSLA): number => {
        const gt = item.task.areaPath?.includes('Gestão de Terceiros') ?? false;
        const isTicket = item.task.type === 'Ticket';
        if (isTicket && gt) return 0;
        if (isTicket && !gt) return 1;
        if (!isTicket && gt) return 2;
        return 3;
      };
      const sortedCards = [...data.cards].sort((a, b) => {
        const aViolated = a.slaViolated ? 1 : 0;
        const bViolated = b.slaViolated ? 1 : 0;
        if (aViolated !== bViolated) return bViolated - aViolated;
        if (aViolated && bViolated)
          return a.businessHoursRemaining - b.businessHoursRemaining;

        const aD = effDeadlineMs(a);
        const bD = effDeadlineMs(b);
        const aH = aD !== Infinity ? 1 : 0;
        const bH = bD !== Infinity ? 1 : 0;
        if (aH !== bH) return bH - aH;
        if (aH && bH && aD !== bD) return aD - bD;

        const wa = typeAreaWCard(a);
        const wb = typeAreaWCard(b);
        if (wa !== wb) return wa - wb;

        const pOrd: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        return (pOrd[a.task.priority] ?? 99) - (pOrd[b.task.priority] ?? 99);
      });

      result.push({
        member,
        inProgressCards: sortedCards,
        hasNoCards: sortedCards.length === 0,
      });
    }

    // Sort members: those with expired/critical cards first, then by name
    result.sort((a, b) => {
      const aHasExpired = a.inProgressCards.some(
        (c) =>
          c.expirationAlert === 'expired' || c.expirationAlert === 'critical',
      );
      const bHasExpired = b.inProgressCards.some(
        (c) =>
          c.expirationAlert === 'expired' || c.expirationAlert === 'critical',
      );
      if (aHasExpired && !bHasExpired) return -1;
      if (!aHasExpired && bHasExpired) return 1;
      return a.member.name.localeCompare(b.member.name);
    });

    return result;
  }

  /**
   * Get task allocation data: all active members with ALL their open tasks
   * filtered by each member's position allowedStatuses, grouped by area.
   */
  async getTaskAllocationData(): Promise<
    import('@shared/interfaces/config/index.types').TaskAllocationMember[]
  > {
    logger.debug('[DashboardService.getTaskAllocationData]');

    // 1. Get all active members (with position relation)
    const activeMembers = await this.teamMemberRepository.findActive();

    // 2. Get ALL tasks (not just sustentação)
    const allTasks = await this.taskRepository.findAllWithRelations();

    // 3. Build project display name map (configId → displayName) for task indicators
    const projects = await this.azureDevOpsService.listProjects();
    const projectDisplayNames = new Map<number, string>(
      projects.map((p) => [p.id, p.displayName]),
    );
    const showProjectIndicator = projects.length > 1;

    // 4. Filter: only open tasks
    const openTasks = allTasks.filter(
      (t) => !CLOSED_STATUSES.includes(t.status),
    );

    // 4. Index by assignedToEmail (lowercase)
    const tasksByEmail = new Map<
      string,
      import('../entities/task.entity').TaskEntity[]
    >();
    for (const task of openTasks) {
      const email = task.assignedToEmail?.toLowerCase();
      if (!email) continue;
      if (!tasksByEmail.has(email)) tasksByEmail.set(email, []);
      tasksByEmail.get(email)!.push(task);
    }

    // 5. For each member, filter by position's allowedStatuses and group by area
    const result: import('@shared/interfaces/config/index.types').TaskAllocationMember[] =
      [];

    for (const entity of activeMembers) {
      const email = entity.email?.toLowerCase();
      const assignedTasks = email ? (tasksByEmail.get(email) ?? []) : [];

      // Parse allowed statuses from position
      const allowedStatuses = entity.position?.allowedStatuses
        ? entity.position.allowedStatuses
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

      // Filter by position's allowed statuses
      const filteredTasks =
        allowedStatuses.length > 0
          ? assignedTasks.filter((task) => {
              const status = task.status?.toLowerCase() ?? '';
              return allowedStatuses.some((allowed) =>
                status.includes(allowed),
              );
            })
          : assignedTasks;

      // Group by area context
      const groupMap = new Map<
        string,
        import('@shared/interfaces/config/index.types').Task[]
      >();
      for (const task of filteredTasks) {
        const area = this.classifyArea(task.areaPath);
        if (!groupMap.has(area)) groupMap.set(area, []);
        const taskDto = this.mapTaskToDto(task);
        if (showProjectIndicator && task.origin === 'azure_devops') {
          taskDto.azureDevOpsConfigId = task.azureDevOpsConfigId ?? null;
          taskDto.azureProjectDisplayName = task.azureDevOpsConfigId
            ? (projectDisplayNames.get(task.azureDevOpsConfigId) ??
              'Projeto desconhecido')
            : 'Projeto desconhecido';
        }
        groupMap.get(area)!.push(taskDto);
      }

      const taskGroups = Array.from(groupMap.entries())
        .map(([area, tasks]) => ({ area, tasks }))
        .sort((a, b) => a.area.localeCompare(b.area));

      const member = this.mapTeamMemberToDto(entity);
      const totalTasks = filteredTasks.length;

      result.push({
        member,
        taskGroups,
        positionName: entity.position?.name,
        totalTasks,
        hasCards: totalTasks > 0,
        hasAllowedStatuses: allowedStatuses.length > 0,
      });
    }

    // Sort: alert members first (hasAllowedStatuses && !hasCards), then by name
    result.sort((a, b) => {
      const aAlert = a.hasAllowedStatuses && !a.hasCards;
      const bAlert = b.hasAllowedStatuses && !b.hasCards;
      if (aAlert && !bAlert) return -1;
      if (!aAlert && bAlert) return 1;
      return a.member.name.localeCompare(b.member.name);
    });

    return result;
  }

  /**
   * Classifies a task's areaPath to a SlaSubArea key used for dynamic SLA lookups.
   */
  private classifySubArea(
    areaPath: string | undefined,
    sustentacaoAreaPath: string,
  ): import('../entities/sla-config.entity').SlaSubArea {
    if (!areaPath) return 'outros';
    if (!areaPath.startsWith(sustentacaoAreaPath)) return 'outros';
    if (areaPath.includes('Gestão de Terceiros')) return 'gestao_terceiros';
    if (areaPath.includes('Chamada Tecnológica')) return 'chamada_tecnologica';
    return 'outros';
  }

  /** Classify a task's areaPath into a display-friendly group name */
  private classifyArea(areaPath?: string): string {
    if (!areaPath) return 'Outros';
    if (areaPath.startsWith(SUSTENTACAO_AREA_PATH_PATTERN)) {
      if (areaPath.includes('Gestão de Terceiros'))
        return 'Gestão de Terceiros';
      if (areaPath.includes('Chamada Tecnológica'))
        return 'Chamada Tecnológica';
      return 'Sustentação';
    }
    if (areaPath.startsWith(PROJETOS_AREA_PATH_PATTERN)) {
      // Extract project name: "Tribo SEIF\Projetos\ProjectName\..." → "ProjectName"
      const parts = areaPath.split('\\');
      return parts.length > 2 ? `Projetos - ${parts[2]}` : 'Projetos';
    }
    return 'Outros';
  }

  /** Map a TaskEntity to the shared Task DTO */
  private mapTaskToDto(
    entity: import('../entities/task.entity').TaskEntity,
  ): import('@shared/interfaces/config/index.types').Task {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      priority:
        entity.priority as import('@shared/interfaces/config/index.types').TaskPriority,
      type: entity.type,
      origin:
        entity.origin as import('@shared/interfaces/config/index.types').TaskOrigin,
      externalId: entity.externalId,
      sprintId: entity.sprintId,
      teamId: entity.teamId,
      assignedToName: entity.assignedToName,
      assignedToEmail: entity.assignedToEmail,
      areaPath: entity.areaPath,
      iterationPath: entity.iterationPath,
      tags: entity.tags,
      storyPoints: entity.storyPoints,
      azureCreatedDate: entity.azureCreatedDate,
      azureChangedDate: entity.azureChangedDate,
      azurePriority: entity.azurePriority,
      parentId: entity.parentId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
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

  /**
   * Get metrics/KPIs for the Sustentação dashboard.
   * Calculates stats from both open items and recently closed Tickets.
   */
  async getSustentacaoMetrics(
    statuses?: string[],
    configId?: number,
  ): Promise<
    import('@shared/interfaces/config/index.types').SustentacaoMetrics
  > {
    logger.debug('[DashboardService.getSustentacaoMetrics]', {
      statuses,
      configId,
    });

    // 1. Get open items (already calculated with SLA)
    const allOpenItems = await this.getSustentacaoItems({}, configId);

    // Filter by statuses if provided (dev + auditoria lanes)
    const statusSet = statuses
      ? new Set(statuses.map((s) => s.toLowerCase()))
      : null;
    const openItems = statusSet
      ? allOpenItems.filter((i) => statusSet.has(i.task.status.toLowerCase()))
      : allOpenItems;

    // Exclude hidden items entirely from metrics (they are irrelevant, e.g. hour-tracking tasks)
    const visibleItems = openItems.filter((i) => !i.isHidden);

    const openTickets = visibleItems.filter((i) => i.task.type === 'Ticket');
    const openImprovements = visibleItems.filter(
      (i) => i.task.type === 'Improvement',
    );

    // SLA metrics: only tickets that are NOT SLA-excluded
    const ticketsWithSla = openTickets.filter((i) => !i.slaExcluded);
    const slaViolated = ticketsWithSla.filter((i) => i.slaViolated);
    const slaWarning = ticketsWithSla.filter((i) => i.slaWarning);
    const slaUrgent = ticketsWithSla.filter(
      (i) =>
        !i.slaViolated &&
        i.businessHoursRemaining > 0 &&
        i.businessHoursRemaining <= 8,
    );
    const unassigned = visibleItems.filter((i) => !i.task.assignedToName);

    // Average age of open Tickets (business hours) — only SLA-active
    const avgAge =
      ticketsWithSla.length > 0
        ? ticketsWithSla.reduce((sum, i) => sum + i.businessHoursElapsed, 0) /
          ticketsWithSla.length
        : 0;

    // Oldest open ticket (with externalId) — only SLA-active
    let oldestTicketHours: number | null = null;
    let oldestTicketExternalId: string | null = null;
    if (ticketsWithSla.length > 0) {
      let oldest = ticketsWithSla[0];
      for (const t of ticketsWithSla) {
        if (t.businessHoursElapsed > oldest.businessHoursElapsed) {
          oldest = t;
        }
      }
      oldestTicketHours = oldest.businessHoursElapsed;
      oldestTicketExternalId = oldest.task.externalId ?? null;
    }

    // By priority
    const prioMap = new Map<string, number>();
    for (const item of visibleItems) {
      const p = item.task.priority ?? 'medium';
      prioMap.set(p, (prioMap.get(p) ?? 0) + 1);
    }
    const byPriority = Array.from(prioMap.entries()).map(
      ([priority, count]) => ({ priority, count }),
    );

    // 2. Get recently closed Tickets for avg close time (all closed, not filtered by status)
    const allTasks = await this.taskRepository.findAllWithRelations();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const closedTickets = allTasks.filter((task) => {
      const isTicket = task.type === 'Ticket';
      const isSustentacao =
        task.areaPath?.startsWith(SUSTENTACAO_AREA_PATH_PATTERN) ?? false;
      const isClosed = CLOSED_STATUSES.includes(task.status);
      const closedRecently = task.updatedAt && task.updatedAt >= thirtyDaysAgo;
      return isTicket && isSustentacao && isClosed && closedRecently;
    });

    let avgCloseTime: number | null = null;
    if (closedTickets.length > 0) {
      const closeTimes: number[] = [];
      for (const t of closedTickets) {
        const start = t.azureCreatedDate ?? t.startDate ?? t.createdAt;
        const end = t.updatedAt ?? now;
        if (start) {
          closeTimes.push(calculateBusinessHours(start, end));
        }
      }
      if (closeTimes.length > 0) {
        avgCloseTime =
          closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length;
      }
    }

    const activeTickets = ticketsWithSla;

    return {
      totalOpen: visibleItems.length,
      openTickets: openTickets.length,
      openImprovements: openImprovements.length,
      slaViolatedCount: slaViolated.length,
      slaViolatedPercent:
        activeTickets.length > 0
          ? Math.round((slaViolated.length / activeTickets.length) * 100)
          : 0,
      slaWarningCount: slaWarning.length,
      slaUrgentCount: slaUrgent.length,
      unassignedCount: unassigned.length,
      avgAgeBusinessHours: Math.round(avgAge * 10) / 10,
      avgCloseTimeBusinessHours:
        avgCloseTime !== null ? Math.round(avgCloseTime * 10) / 10 : null,
      closedTicketsLast30Days: closedTickets.length,
      byPriority,
      oldestOpenTicketHours:
        oldestTicketHours !== null
          ? Math.round(oldestTicketHours * 10) / 10
          : null,
      oldestOpenTicketExternalId: oldestTicketExternalId,
    };
  }

  // ============================================================================
  // Task Update History Methods
  // ============================================================================

  /**
   * Get update history for a specific task, ordered by changedDate descending.
   *
   * Validates: Requirement 4.1 (chronological descending order)
   *
   * @param taskId - The task ID to get history for
   * @returns Array of TaskUpdateRecord
   */
  async getTaskUpdateHistory(
    taskId: number,
  ): Promise<
    import('@shared/interfaces/config/index.types').TaskUpdateRecord[]
  > {
    logger.debug('[DashboardService.getTaskUpdateHistory]', { taskId });

    const updates = await this.taskUpdateRepository.findByTaskId(taskId);

    return updates.map((u) => ({
      id: u.id,
      changedDate: u.changedDate,
      changedBy: u.changedBy,
      fieldName: u.fieldName,
      oldValue: u.oldValue,
      newValue: u.newValue,
    }));
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
  async getProjetosItems(
    sprintId: number,
    referenceDate: Date = new Date(),
    configId?: number,
  ): Promise<ProjetosResult> {
    logger.debug('[DashboardService.getProjetosItems]', { sprintId, configId });

    const areaPattern = await this.getProjetosAreaPath(configId);

    // Get tasks for the specified sprint
    const sprintTasks = await this.taskRepository.findBySprint(sprintId);

    // Filter by area_path and (when configId provided) by azure_devops_config_id
    const filteredTasks = sprintTasks.filter((task) => {
      const areaMatch = task.areaPath?.startsWith(areaPattern) ?? false;
      if (!areaMatch) return false;
      if (configId) {
        // Include tasks that belong to this config, OR legacy tasks without configId that match area
        return (
          task.azureDevOpsConfigId === configId ||
          task.azureDevOpsConfigId == null
        );
      }
      return true;
    });

    // Get external IDs for priority lookup
    const externalIds = filteredTasks
      .map((t) => t.externalId)
      .filter((id): id is string => id !== undefined && id !== null);

    // Get local priorities
    const priorityMap =
      await this.taskLocalPriorityRepository.findByExternalIds(externalIds);

    // Pre-fetch all children in one batch query to avoid N+1
    const taskIds = filteredTasks.map((t) => t.id);
    const childrenByParentId =
      await this.taskRepository.findByParentIds(taskIds);

    // Build ProjetosItem array with enriched data
    const items: ProjetosItem[] = filteredTasks.map((task) => {
      const localPriority = task.externalId
        ? (priorityMap.get(task.externalId) ?? 0)
        : 0;

      // Get children and calculate progress
      const children = childrenByParentId.get(task.id) ?? [];
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
    });

    // Group items by status category (Req 3.3)
    const groupedByStatus: ProjetosResult['groupedByStatus'] = {
      pending: [],
      inProgress: [],
      completed: [],
      cancelled: [],
    };

    for (const item of items) {
      const category = categorizeStatus(item.task.status);
      groupedByStatus[category].push(item);
    }

    // Calculate quantitative summary (Req 3.6, Property 8)
    const pendingCount = groupedByStatus.pending.length;
    const inProgressCount = groupedByStatus.inProgress.length;
    const completedCount = groupedByStatus.completed.length;
    const cancelledCount = groupedByStatus.cancelled.length;
    const total =
      pendingCount + inProgressCount + completedCount + cancelledCount;
    const completionPercentage = total > 0 ? (completedCount / total) * 100 : 0;

    const summary: SprintQuantitativeSummary = {
      total,
      completed: completedCount,
      inProgress: inProgressCount,
      pending: pendingCount,
      cancelled: cancelledCount,
      completionPercentage,
    };

    // Compute sprint alerts (Req 3.4, 3.5)
    const alerts = await this.computeSprintAlerts(
      sprintId,
      groupedByStatus,
      referenceDate,
    );

    return { items, groupedByStatus, summary, alerts };
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

    // Build UserStoryProgress array — use batch query to avoid N+1
    const userStoryIds = userStories.map((t) => t.id);
    const childrenByParentId =
      await this.taskRepository.findByParentIds(userStoryIds);

    const items: UserStoryProgress[] = userStories.map((task) => {
      // Get children (Tasks)
      const children = childrenByParentId.get(task.id) ?? [];
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
    });

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
        color: STATUS_COLORS_LOOKUP(status),
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
  // Dashboard Projetos Methods — Sprint Identification
  // ============================================================================

  /**
   * Get the current sprint for a given team by date range.
   *
   * Property 7: For any set of sprints and any reference date, the current sprint is the one
   * whose startDate <= referenceDate and endDate >= referenceDate. If multiple sprints satisfy
   * the condition for the same team, the most recent (by startDate) should be selected.
   * If none satisfies, the result should be null.
   *
   * Validates: Requirements 3.2
   *
   * @param teamId - The team ID to find the current sprint for
   * @param referenceDate - Optional reference date (defaults to now)
   * @returns The current sprint entity or null
   */
  async getCurrentSprintForTeam(
    teamId: number,
    referenceDate: Date = new Date(),
  ): Promise<SprintEntity | null> {
    logger.debug('[DashboardService.getCurrentSprintForTeam]', {
      teamId,
      referenceDate,
    });

    const sprints = await this.sprintRepository.findByTeam(teamId);
    return findCurrentSprint(sprints, referenceDate, teamId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Compute sprint alerts for pending and stagnant items.
   *
   * When there are ≤5 business days remaining until sprint end:
   * - Pending items (status = 'pending') generate 'pending_no_progress' alerts (Req 3.4)
   * - In-progress items not updated in 2+ business days generate 'stagnant' alerts (Req 3.5)
   *
   * Validates: Requirements 3.4, 3.5
   */
  private async computeSprintAlerts(
    sprintId: number,
    groupedByStatus: ProjetosResult['groupedByStatus'],
    referenceDate: Date,
  ): Promise<SprintAlert[]> {
    const alerts: SprintAlert[] = [];

    // Fetch the sprint to get its endDate
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      logger.warn('[DashboardService.computeSprintAlerts] Sprint not found', {
        sprintId,
      });
      return alerts;
    }

    const businessDaysRemaining = calculateBusinessDaysRemaining(
      referenceDate,
      sprint.endDate,
    );

    logger.debug('[DashboardService.computeSprintAlerts]', {
      sprintId,
      sprintEndDate: sprint.endDate,
      businessDaysRemaining,
    });

    // Only generate alerts when ≤5 business days remain
    if (businessDaysRemaining > 5) {
      return alerts;
    }

    // Req 3.4: Flag pending items as "no progress" alerts
    for (const item of groupedByStatus.pending) {
      alerts.push({
        type: 'pending_no_progress',
        taskId: item.task.id,
        externalId: item.task.externalId ?? undefined,
        taskTitle: item.task.title,
        parentExternalId: item.task.parent?.externalId ?? undefined,
        parentTitle: item.task.parent?.title ?? undefined,
        message: `Item "${item.task.title}" está pendente sem progresso com ${businessDaysRemaining} dia(s) útil(eis) restante(s) na sprint.`,
      });
    }

    // Req 3.5: Flag in-progress items not updated in 2+ business days as "stagnant"
    // Only alert for desenvolvimento and auditoria phases — homologação/implantação are post-dev
    const ALERT_STATUSES = [
      'in_progress',
      'Active',
      'In Progress',
      'Committed',
      'Em Andamento',
      'Em andamento',
      'Em Desenvolvimento',
      'Em desenvolvimento',
      'Preparando para Dev',
      'Aguardando desenvolvimento',
      'Em classificação',
      'Backlog Comprometido',
      'Aguardando Auditoria',
      'Aguardando auditoria',
      'Em Auditoria',
      'Em auditoria',
    ];

    const alertableInProgress = groupedByStatus.inProgress.filter((item) =>
      ALERT_STATUSES.includes(item.task.status),
    );

    for (const item of alertableInProgress) {
      const lastUpdate = item.task.updatedAt;
      if (lastUpdate) {
        const businessDaysSinceUpdate = calculateBusinessDaysSince(
          lastUpdate,
          referenceDate,
        );
        if (businessDaysSinceUpdate >= 2) {
          alerts.push({
            type: 'stagnant',
            taskId: item.task.id,
            externalId: item.task.externalId ?? undefined,
            taskTitle: item.task.title,
            parentExternalId: item.task.parent?.externalId ?? undefined,
            parentTitle: item.task.parent?.title ?? undefined,
            message: `Item "${item.task.title}" está em andamento sem atualização há ${businessDaysSinceUpdate} dia(s) útil(eis) com ${businessDaysRemaining} dia(s) útil(eis) restante(s) na sprint.`,
          });
        }
      }
    }

    return alerts;
  }

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
