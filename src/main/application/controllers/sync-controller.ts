import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { SyncService, FullSyncResult } from '../services/sync-service';
import { AzureDevOpsService } from '../services/azure-devops-service';
import { SprintRepository } from '../repositories/sprint-repository';
import { TeamRepository } from '../repositories/team-repository';
import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { BrowserWindow } from 'electron';

export class SyncController extends BaseHandler {
  private static instance: SyncController | null = null;
  private syncService: SyncService;
  private azureDevOpsService: AzureDevOpsService;

  constructor() {
    super();
    this.azureDevOpsService = new AzureDevOpsService();
    this.syncService = new SyncService(
      this.azureDevOpsService,
      new SprintRepository(),
      new TeamRepository(),
      new TeamMemberRepository(),
      new TaskRepository(),
    );
  }

  static getInstance(): SyncController {
    if (!SyncController.instance) {
      SyncController.instance = new SyncController();
    }
    return SyncController.instance;
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.syncService.setMainWindow(window);
  }

  @IpcMethod('azure-devops:fullSync')
  async fullSync(): Promise<ApiResponse<FullSyncResult>> {
    try {
      const config = await this.azureDevOpsService.getConfig();
      if (!config) {
        return {
          success: false,
          error:
            'Configuração do Azure DevOps não encontrada. Configure a integração antes de sincronizar.',
        };
      }

      const result = await this.syncService.fullSync();
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao executar sincronização completa com Azure DevOps';
      logger.error('SyncController.fullSync error:', error);
      return { success: false, error: message };
    }
  }
}
