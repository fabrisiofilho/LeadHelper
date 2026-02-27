import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';
import { SprintRepository } from '../repositories/sprint-repository';
import { TeamRepository } from '../repositories/team-repository';
import { TeamMemberAllocationRepository } from '../repositories/team-member-allocation-repository';
import { TeamMemberAllocationService } from './team-member-allocation-service';
import { TeamMemberEntity } from '../entities/team-member.entity';
import type { AllocationConflict } from './team-member-allocation-service';

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

export class DashboardService {
  private teamMemberRepository: TeamMemberRepository;
  private taskRepository: TaskRepository;
  private sprintRepository: SprintRepository;
  private teamRepository: TeamRepository;
  private allocationRepository: TeamMemberAllocationRepository;
  private allocationService: TeamMemberAllocationService;

  constructor(
    teamMemberRepository?: TeamMemberRepository,
    taskRepository?: TaskRepository,
    sprintRepository?: SprintRepository,
    teamRepository?: TeamRepository,
    allocationRepository?: TeamMemberAllocationRepository,
    allocationService?: TeamMemberAllocationService,
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
  }

  /**
   * Get complete dashboard summary with all metrics for the given period
   */
  async getSummary(period: DashboardPeriod): Promise<DashboardSummary> {
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
    _period: DashboardPeriod,
    _threshold: number = 100,
  ): Promise<TeamMemberWorkload[]> {
    return [];
  }

  /**
   * Get team members with no allocations in the given period
   */
  async getMembersWithoutAllocation(
    _period: DashboardPeriod,
  ): Promise<TeamMember[]> {
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
}
