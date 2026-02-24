import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import {
  TaskCommentService,
  type TaskCommentDto,
  type CreateTaskCommentInput,
  type UpdateTaskCommentInput,
} from '../services/task-comment-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class TaskCommentController extends BaseHandler {
  private service: TaskCommentService;

  constructor() {
    super();
    this.service = new TaskCommentService();
  }

  @IpcMethod('task-comment:findByTask')
  async findByTask(taskId: number): Promise<ApiResponse<TaskCommentDto[]>> {
    try {
      const result = await this.service.findByTask(taskId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao listar comentários';
      logger.error('TaskCommentController.findByTask error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-comment:create')
  async create(
    data: CreateTaskCommentInput,
  ): Promise<ApiResponse<TaskCommentDto>> {
    try {
      const result = await this.service.create(data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao criar comentário';
      logger.error('TaskCommentController.create error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-comment:update')
  async update(
    id: number,
    data: UpdateTaskCommentInput,
  ): Promise<ApiResponse<TaskCommentDto>> {
    try {
      const result = await this.service.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar comentário';
      logger.error('TaskCommentController.update error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('task-comment:delete')
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.delete(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir comentário';
      logger.error('TaskCommentController.delete error:', error);
      return { success: false, error: message };
    }
  }
}
