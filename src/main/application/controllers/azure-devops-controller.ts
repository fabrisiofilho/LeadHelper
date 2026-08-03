import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { AzureDevOpsService } from '../services/azure-devops-service';
import type {
  AzureDevOpsConfig,
  WorkItemFilters,
  WorkItem,
} from '../services/azure-devops-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import type { AzureDevOpsConfigInput } from '@shared/interfaces';
import type {
  IterationNode,
  AzureDevOpsProjectConfig,
  AzureDevOpsProjectInput,
} from '@shared/interfaces/config/index.types';

export class AzureDevOpsController extends BaseHandler {
  private service: AzureDevOpsService;

  constructor() {
    super();
    this.service = new AzureDevOpsService();
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
  async getConfig(
    includePat = false,
  ): Promise<ApiResponse<AzureDevOpsConfig | null>> {
    try {
      const result = await this.service.getConfig(includePat);
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
    filters?: WorkItemFilters,
  ): Promise<ApiResponse<WorkItem[]>> {
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

  @IpcMethod('azure-devops:fetchIterations')
  async fetchIterations(): Promise<ApiResponse<IterationNode[]>> {
    try {
      const result = await this.service.fetchIterations();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar iterations do Azure DevOps';
      logger.error('AzureDevOpsController.fetchIterations error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:proxyImage')
  async proxyImage(imageUrl: string): Promise<ApiResponse<string>> {
    try {
      const dataUri = await this.service.proxyImage(imageUrl);
      return { success: true, data: dataUri };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao buscar imagem';
      logger.error('AzureDevOpsController.proxyImage error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:listProjects')
  async listProjects(): Promise<ApiResponse<AzureDevOpsProjectConfig[]>> {
    try {
      const result = await this.service.listProjects();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao listar projetos';
      logger.error('AzureDevOpsController.listProjects error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:saveProject')
  async saveProject(
    input: AzureDevOpsProjectInput,
  ): Promise<ApiResponse<AzureDevOpsProjectConfig>> {
    try {
      const result = await this.service.saveProject(input);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar projeto';
      logger.error('AzureDevOpsController.saveProject error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:deleteProject')
  async deleteProject(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.deleteProject(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao remover projeto';
      logger.error('AzureDevOpsController.deleteProject error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:testConnectionById')
  async testConnectionById(id: number): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.service.testConnectionById(id);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao testar conexão';
      logger.error('AzureDevOpsController.testConnectionById error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('azure-devops:getProjectPat')
  async getProjectPat(id: number): Promise<ApiResponse<string>> {
    try {
      const pat = await this.service.getProjectPat(id);
      return { success: true, data: pat };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao recuperar PAT';
      logger.error('AzureDevOpsController.getProjectPat error:', error);
      return { success: false, error: message };
    }
  }
}
