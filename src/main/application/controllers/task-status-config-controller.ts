import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import {
  TaskStatusConfigService,
  type CreateTaskStatusConfigInput,
  type UpdateTaskStatusConfigInput,
  type TaskStatusConfig,
} from '../services/task-status-config-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class TaskStatusConfigController extends BaseHandler {
  private service: TaskStatusConfigService;

  constructor() {
    super();
    this.service = new TaskStatusConfigService();
  }

  @IpcMethod('task-status-config:findAll')
  async findAll(): Promise<ApiResponse<TaskStatusConfig[]>> {
    try {
      const result = await this.service.findAll();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao listar status';
      logger.error('TaskStatusConfigController.findAll error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-status-config:findKanban')
  async findKanban(): Promise<ApiResponse<TaskStatusConfig[]>> {
    try {
      const result = await this.service.findKanbanStatuses();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao listar status do kanban';
      logger.error('TaskStatusConfigController.findKanban error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-status-config:create')
  async create(
    data: CreateTaskStatusConfigInput,
  ): Promise<ApiResponse<TaskStatusConfig>> {
    try {
      const result = await this.service.create(data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao criar status';
      logger.error('TaskStatusConfigController.create error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-status-config:update')
  async update(
    id: number,
    data: UpdateTaskStatusConfigInput,
  ): Promise<ApiResponse<TaskStatusConfig>> {
    try {
      const result = await this.service.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar status';
      logger.error('TaskStatusConfigController.update error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-status-config:delete')
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.delete(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir status';
      logger.error('TaskStatusConfigController.delete error:', error);
      return { success: false, error: message };
    }
  }
}
