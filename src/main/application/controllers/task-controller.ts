import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import * as taskService from '../services/task-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import type { TaskFilters, TaskStatus } from '@shared/interfaces';

export class TaskController extends BaseHandler {
  private service: taskService.TaskService;

  constructor() {
    super();
    this.service = new taskService.TaskService();
  }

  @IpcMethod('task:create')
  async create(
    data: taskService.CreateTaskInput,
  ): Promise<ApiResponse<taskService.Task>> {
    try {
      const result = await this.service.create(data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao criar tarefa';
      logger.error('TaskController.create error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task:update')
  async update(
    id: number,
    data: taskService.UpdateTaskInput,
  ): Promise<ApiResponse<taskService.Task>> {
    try {
      const result = await this.service.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar tarefa';
      logger.error('TaskController.update error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task:delete')
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.delete(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir tarefa';
      logger.error('TaskController.delete error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task:findById')
  async findById(id: number): Promise<ApiResponse<taskService.Task | null>> {
    try {
      const result = await this.service.findById(id);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao buscar tarefa';
      logger.error('TaskController.findById error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task:findAll')
  async findAll(
    filters?: TaskFilters,
  ): Promise<ApiResponse<taskService.Task[]>> {
    try {
      const result = await this.service.findAll(filters);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao listar tarefas';
      logger.error('TaskController.findAll error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task:findByStatus')
  async findByStatus(
    status: TaskStatus,
  ): Promise<ApiResponse<taskService.Task[]>> {
    try {
      const result = await this.service.findByStatus(status);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar tarefas por status';
      logger.error('TaskController.findByStatus error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task:findByPeriod')
  async findByPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<ApiResponse<taskService.Task[]>> {
    try {
      const result = await this.service.findByPeriod(startDate, endDate);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar tarefas por período';
      logger.error('TaskController.findByPeriod error:', error);
      return { success: false, error: message };
    }
  }
  @IpcMethod('task:findBySprint')
  async findBySprint(
    sprintId: number,
  ): Promise<ApiResponse<taskService.Task[]>> {
    try {
      const result = await this.service.findBySprint(sprintId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar tarefas da sprint';
      logger.error('TaskController.findBySprint error:', error);
      return { success: false, error: message };
    }
  }
}
