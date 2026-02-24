import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';
import { AllocationRepository } from '../repositories/allocation-repository';
import { TeamMemberEntity } from '../entities/team-member.entity';

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

export interface Allocation {
  id: number;
  teamMemberId: number;
  taskId: number;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamMemberWorkload {
  teamMember: TeamMember;
  totalWorkload: number;
  allocations: Allocation[];
}

export interface DashboardSummary {
  activeMembers: number;
  tasksInProgress: number;
  totalAllocations: number;
  membersWithHighWorkload: TeamMemberWorkload[];
  membersWithoutAllocation: TeamMember[];
}

export class DashboardService {
  private teamMemberRepository: TeamMemberRepository;
  private taskRepository: TaskRepository;
  private allocationRepository: AllocationRepository;

  constructor(
    teamMemberRepository?: TeamMemberRepository,
    taskRepository?: TaskRepository,
    allocationRepository?: AllocationRepository,
  ) {
    this.teamMemberRepository =
      teamMemberRepository ?? new TeamMemberRepository();
    this.taskRepository = taskRepository ?? new TaskRepository();
    this.allocationRepository =
      allocationRepository ?? new AllocationRepository();
  }

  /**
   * Get complete dashboard summary with all metrics for the given period
   */
  async getSummary(period: DashboardPeriod): Promise<DashboardSummary> {
    const [
      activeMembers,
      tasksInProgress,
      allocationsInPeriod,
      membersWithoutAllocation,
    ] = await Promise.all([
      this.getActiveMembers(),
      this.getTasksInProgress(),
      this.allocationRepository.findByPeriod(period.startDate, period.endDate),
      this.getMembersWithoutAllocation(period),
    ]);

    return {
      activeMembers,
      tasksInProgress,
      totalAllocations: allocationsInPeriod.length,
      membersWithHighWorkload: [], // Workload removed
      membersWithoutAllocation,
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
    period: DashboardPeriod,
  ): Promise<TeamMember[]> {
    // Get all active team members
    const activeMembers = await this.teamMemberRepository.findActive();

    // Get all allocations in the period
    const allocationsInPeriod = await this.allocationRepository.findByPeriod(
      period.startDate,
      period.endDate,
    );

    // Get set of team member IDs that have allocations
    const membersWithAllocations = new Set(
      allocationsInPeriod.map((a) => a.teamMemberId),
    );

    // Filter members without allocations
    const membersWithoutAllocation = activeMembers.filter(
      (member) => !membersWithAllocations.has(member.id),
    );

    return membersWithoutAllocation.map((member) =>
      this.mapTeamMemberToDto(member),
    );
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
