import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import * as dashboardService from '../services/dashboard-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class DashboardController extends BaseHandler {
  private service: dashboardService.DashboardService;

  constructor() {
    super();
    this.service = new dashboardService.DashboardService();
  }

  @IpcMethod('dashboard:getSummary')
  async getSummary(
    period: dashboardService.DashboardPeriod,
  ): Promise<ApiResponse<dashboardService.DashboardSummary>> {
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
    period: dashboardService.DashboardPeriod,
  ): Promise<ApiResponse<dashboardService.TeamMemberWorkload[]>> {
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
    period: dashboardService.DashboardPeriod,
  ): Promise<ApiResponse<dashboardService.TeamMember[]>> {
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
}
