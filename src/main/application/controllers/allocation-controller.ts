import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import * as allocationService from '../services/allocation-service';
import * as ganttService from '../services/gantt-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class AllocationController extends BaseHandler {
  private service: allocationService.AllocationService;
  private ganttService: ganttService.GanttService;

  constructor() {
    super();
    this.service = new allocationService.AllocationService();
    this.ganttService = new ganttService.GanttService();
  }

  @IpcMethod('allocation:create')
  async create(
    data: allocationService.CreateAllocationInput,
  ): Promise<ApiResponse<allocationService.Allocation>> {
    try {
      const result = await this.service.create(data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao criar alocação';
      logger.error('AllocationController.create error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:update')
  async update(
    id: number,
    data: allocationService.UpdateAllocationInput,
  ): Promise<ApiResponse<allocationService.Allocation>> {
    try {
      const result = await this.service.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar alocação';
      logger.error('AllocationController.update error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:delete')
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.delete(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir alocação';
      logger.error('AllocationController.delete error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:findById')
  async findById(
    id: number,
  ): Promise<ApiResponse<allocationService.Allocation | null>> {
    try {
      const result = await this.service.findById(id);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao buscar alocação';
      logger.error('AllocationController.findById error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:findByTeamMember')
  async findByTeamMember(
    teamMemberId: number,
  ): Promise<ApiResponse<allocationService.Allocation[]>> {
    try {
      const result = await this.service.findByTeamMember(teamMemberId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar alocações do membro';
      logger.error('AllocationController.findByTeamMember error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:findByTask')
  async findByTask(
    taskId: number,
  ): Promise<ApiResponse<allocationService.Allocation[]>> {
    try {
      const result = await this.service.findByTask(taskId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar alocações da tarefa';
      logger.error('AllocationController.findByTask error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:findByPeriod')
  async findByPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<ApiResponse<allocationService.Allocation[]>> {
    try {
      const result = await this.service.findByPeriod(startDate, endDate);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar alocações por período';
      logger.error('AllocationController.findByPeriod error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('allocation:getGanttData')
  async getGanttData(
    filters: ganttService.GanttFilters,
  ): Promise<ApiResponse<ganttService.GanttData>> {
    try {
      const result = await this.ganttService.getGanttData(filters);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao obter dados do Gantt';
      logger.error('AllocationController.getGanttData error:', error);
      return { success: false, error: message };
    }
  }
}
