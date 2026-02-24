import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import * as azureDevopsService from '../services/azure-devops-service';
import { TaskEntity } from '../entities/task.entity';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import type { AzureDevOpsConfigInput } from '@shared/interfaces';

export class AzureDevOpsController extends BaseHandler {
  private service: azureDevopsService.AzureDevOpsService;

  constructor() {
    super();
    this.service = new azureDevopsService.AzureDevOpsService();
  }

  @IpcMethod('azure-devops:saveConfig')
  async saveConfig(config: AzureDevOpsConfigInput): Promise<ApiResponse<void>> {
    try {
      await this.service.saveConfig(config);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao salvar configuração do Azure DevOps';
      logger.error('AzureDevOpsController.saveConfig error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:getConfig')
  async getConfig(): Promise<
    ApiResponse<azureDevopsService.AzureDevOpsConfig | null>
  > {
    try {
      const result = await this.service.getConfig();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar configuração do Azure DevOps';
      logger.error('AzureDevOpsController.getConfig error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:testConnection')
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.service.testConnection();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao testar conexão com Azure DevOps';
      logger.error('AzureDevOpsController.testConnection error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:fetchWorkItems')
  async fetchWorkItems(
    filters?: azureDevopsService.WorkItemFilters,
  ): Promise<ApiResponse<azureDevopsService.WorkItem[]>> {
    try {
      const result = await this.service.fetchWorkItems(filters);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar work items do Azure DevOps';
      logger.error('AzureDevOpsController.fetchWorkItems error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:importWorkItems')
  async importWorkItems(
    workItemIds: number[],
  ): Promise<ApiResponse<TaskEntity[]>> {
    try {
      const result = await this.service.importWorkItems(workItemIds);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao importar work items do Azure DevOps';
      logger.error('AzureDevOpsController.importWorkItems error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:syncTask')
  async syncTask(taskId: number): Promise<ApiResponse<TaskEntity>> {
    try {
      const result = await this.service.syncTask(taskId);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao sincronizar tarefa com Azure DevOps';
      logger.error('AzureDevOpsController.syncTask error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:syncAllImportedTasks')
  async syncAllImportedTasks(): Promise<
    ApiResponse<azureDevopsService.SyncResult>
  > {
    try {
      const result = await this.service.syncAllImportedTasks();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao sincronizar tarefas importadas';
      logger.error('AzureDevOpsController.syncAllImportedTasks error:', error);
      return { success: false, error: message };
    }
  }
}
