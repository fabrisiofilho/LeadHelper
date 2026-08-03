import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { DashboardService } from '../services/dashboard-service';
import type {
  AllocationDashboard,
  TaskManagementDashboard,
  SprintDashboard,
  DashboardPeriod,
  DashboardSummary,
  TeamMemberWorkload,
  TeamMember,
  SustentacaoOptions,
  SustentacaoItemWithSLA,
  SustentacaoMemberWithCards,
  ProjetosResult,
  BurndownPoint,
  StatusCount,
  AssigneeCount,
  HierarchyProgress,
} from '../services/dashboard-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { TaskSlaExclusionRepository } from '../repositories/task-sla-exclusion-repository';
import { TaskHiddenRepository } from '../repositories/task-hidden-repository';
import type {
  SustentacaoMetrics,
  TaskAllocationMember,
} from '@shared/interfaces/config/index.types';

export class DashboardController extends BaseHandler {
  private service: DashboardService;
  private slaExclusionRepo: TaskSlaExclusionRepository;
  private hiddenRepo: TaskHiddenRepository;

  constructor() {
    super();
    this.service = new DashboardService();
    this.slaExclusionRepo = new TaskSlaExclusionRepository();
    this.hiddenRepo = new TaskHiddenRepository();
  }

  @IpcMethod('dashboard:getSummary')
  async getSummary(
    period: DashboardPeriod,
  ): Promise<ApiResponse<DashboardSummary>> {
    try {
      const result = await this.service.getSummary(period);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter resumo do dashboard';
      logger.error('DashboardController.getSummary error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getActiveMembers')
  async getActiveMembers(): Promise<ApiResponse<number>> {
    try {
      const result = await this.service.getActiveMembers();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao obter membros ativos';
      logger.error('DashboardController.getActiveMembers error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getTasksInProgress')
  async getTasksInProgress(): Promise<ApiResponse<number>> {
    try {
      const result = await this.service.getTasksInProgress();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter tarefas em andamento';
      logger.error('DashboardController.getTasksInProgress error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getMembersWithHighWorkload')
  async getMembersWithHighWorkload(
    period: DashboardPeriod,
  ): Promise<ApiResponse<TeamMemberWorkload[]>> {
    try {
      const result = await this.service.getMembersWithHighWorkload(period);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter membros com alta carga';
      logger.error(
        'DashboardController.getMembersWithHighWorkload error:',
        error,
      );
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getMembersWithoutAllocation')
  async getMembersWithoutAllocation(
    period: DashboardPeriod,
  ): Promise<ApiResponse<TeamMember[]>> {
    try {
      const result = await this.service.getMembersWithoutAllocation(period);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter membros sem alocação';
      logger.error(
        'DashboardController.getMembersWithoutAllocation error:',
        error,
      );
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getAllocationDashboard')
  async getAllocationDashboard(): Promise<ApiResponse<AllocationDashboard>> {
    try {
      const result = await this.service.getAllocationDashboard();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter dashboard de alocação';
      logger.error('DashboardController.getAllocationDashboard error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getTaskManagementDashboard')
  async getTaskManagementDashboard(): Promise<
    ApiResponse<TaskManagementDashboard>
  > {
    try {
      const result = await this.service.getTaskManagementDashboard();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter dashboard de gestão de tarefas';
      logger.error(
        'DashboardController.getTaskManagementDashboard error:',
        error,
      );
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getSprintDashboard')
  async getSprintDashboard(): Promise<ApiResponse<SprintDashboard>> {
    try {
      const result = await this.service.getSprintDashboard();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter dashboard de sprints';
      logger.error('DashboardController.getSprintDashboard error:', error);
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Dashboard Sustentação Handlers
  // ============================================================================

  /**
   * Get work items for the Sustentação dashboard.
   *
   * Property 1: Filters items where:
   * - type IN ('Ticket', 'Improvement')
   * - area_path LIKE 'Tribo SEIF\Sustentação\%'
   * - status NOT IN ('completed', 'cancelled')
   *
   * Validates: Requirements 2.1, 2.2, 2.3
   *
   * @param options - Optional filtering options (staleDays, sortBy)
   * @returns Array of SustentacaoItem with enriched data
   */
  @IpcMethod('dashboard:getSustentacaoItems')
  async getSustentacaoItems(
    options?: SustentacaoOptions,
    configId?: number,
  ): Promise<ApiResponse<SustentacaoItemWithSLA[]>> {
    try {
      const result = await this.service.getSustentacaoItems(options, configId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter itens de Sustentação';
      logger.error('DashboardController.getSustentacaoItems error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:invalidateCache')
  async invalidateCache(): Promise<ApiResponse<void>> {
    this.service.invalidateSustentacaoCache();
    return { success: true };
  }

  @IpcMethod('dashboard:getSustentacaoMetrics')
  async getSustentacaoMetrics(
    statuses?: string[],
    configId?: number,
  ): Promise<ApiResponse<SustentacaoMetrics>> {
    try {
      const result = await this.service.getSustentacaoMetrics(
        statuses,
        configId,
      );
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter métricas de Sustentação';
      logger.error('DashboardController.getSustentacaoMetrics error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getSustentacaoMembersWithCards')
  async getSustentacaoMembersWithCards(
    configId?: number,
  ): Promise<ApiResponse<SustentacaoMemberWithCards[]>> {
    try {
      const result =
        await this.service.getSustentacaoMembersWithCards(configId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter membros de Sustentação';
      logger.error(
        'DashboardController.getSustentacaoMembersWithCards error:',
        error,
      );
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getTaskAllocationData')
  async getTaskAllocationData(): Promise<ApiResponse<TaskAllocationMember[]>> {
    try {
      const result = await this.service.getTaskAllocationData();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter dados de alocação de tarefas';
      logger.error('DashboardController.getTaskAllocationData error:', error);
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Task Update History Handlers
  // ============================================================================

  /**
   * Get update history for a specific task.
   *
   * Validates: Requirement 4.1
   */
  @IpcMethod('dashboard:getTaskUpdateHistory')
  async getTaskUpdateHistory(taskId: number): Promise<ApiResponse<unknown[]>> {
    try {
      const result = await this.service.getTaskUpdateHistory(taskId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter histórico de atualizações';
      logger.error('DashboardController.getTaskUpdateHistory error:', error);
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Dashboard Projetos Handlers
  // ============================================================================

  /**
   * Get work items for the Projetos dashboard filtered by Sprint.
   *
   * Property 2: Filters items where:
   * - area_path LIKE 'Tribo SEIF\Projetos\%'
   * - sprint_id = selected Sprint
   *
   * Validates: Requirements 5.1
   *
   * @param sprintId - The Sprint ID to filter by
   * @returns Array of ProjetosItem with enriched data
   */
  @IpcMethod('dashboard:getProjetosItems')
  async getProjetosItems(
    sprintId: number,
    configId?: number,
  ): Promise<ApiResponse<ProjetosResult>> {
    try {
      const result = await this.service.getProjetosItems(
        sprintId,
        new Date(),
        configId,
      );
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter itens de Projetos';
      logger.error('DashboardController.getProjetosItems error:', error);
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Chart Handlers
  // ============================================================================

  /**
   * Get burndown data for a Sprint.
   *
   * Property 41: For each day in the Sprint:
   * - planned: total items in the Sprint
   * - completed: items with status 'Done' or 'Closed' and updatedAt <= date
   *
   * Validates: Requirements 19.1
   *
   * @param sprintId - The Sprint ID to get burndown data for
   * @returns Array of BurndownPoint for each day in the Sprint
   */
  @IpcMethod('dashboard:getBurndownData')
  async getBurndownData(
    sprintId: number,
  ): Promise<ApiResponse<BurndownPoint[]>> {
    try {
      const result = await this.service.getBurndownData(sprintId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter dados de burndown';
      logger.error('DashboardController.getBurndownData error:', error);
      return { success: false, error: message };
    }
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
  @IpcMethod('dashboard:getStatusDistribution')
  async getStatusDistribution(
    parentId?: number,
  ): Promise<ApiResponse<StatusCount[]>> {
    try {
      const result = await this.service.getStatusDistribution(parentId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter distribuição por status';
      logger.error('DashboardController.getStatusDistribution error:', error);
      return { success: false, error: message };
    }
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
  @IpcMethod('dashboard:getAssigneeDistribution')
  async getAssigneeDistribution(
    parentId?: number,
  ): Promise<ApiResponse<AssigneeCount[]>> {
    try {
      const result = await this.service.getAssigneeDistribution(parentId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter distribuição por assignee';
      logger.error('DashboardController.getAssigneeDistribution error:', error);
      return { success: false, error: message };
    }
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
  @IpcMethod('dashboard:getHierarchyProgress')
  async getHierarchyProgress(
    parentId: number,
  ): Promise<ApiResponse<HierarchyProgress>> {
    try {
      const result = await this.service.getHierarchyProgress(parentId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao obter progresso hierárquico';
      logger.error('DashboardController.getHierarchyProgress error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:excludeSla')
  async excludeSla(
    externalId: string,
    reason?: string,
  ): Promise<ApiResponse<void>> {
    try {
      await this.slaExclusionRepo.exclude(externalId, reason);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir SLA';
      logger.error('DashboardController.excludeSla error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:restoreSla')
  async restoreSla(externalId: string): Promise<ApiResponse<void>> {
    try {
      await this.slaExclusionRepo.restore(externalId);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao restaurar SLA';
      logger.error('DashboardController.restoreSla error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:getSlaExclusions')
  async getSlaExclusions(): Promise<ApiResponse<string[]>> {
    try {
      const all = await this.slaExclusionRepo.find();
      return { success: true, data: all.map((e) => e.externalId) };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar exclusões de SLA';
      logger.error('DashboardController.getSlaExclusions error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:hideItem')
  async hideItem(
    externalId: string,
    reason?: string,
  ): Promise<ApiResponse<void>> {
    try {
      await this.hiddenRepo.hide(externalId, reason);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao ocultar item';
      logger.error('DashboardController.hideItem error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('dashboard:unhideItem')
  async unhideItem(externalId: string): Promise<ApiResponse<void>> {
    try {
      await this.hiddenRepo.unhide(externalId);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao reativar item';
      logger.error('DashboardController.unhideItem error:', error);
      return { success: false, error: message };
    }
  }
}
