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

export interface SyncStatus {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  isSyncing: boolean;
  isConfigured: boolean;
}

const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export class SyncController extends BaseHandler {
  private static instance: SyncController | null = null;
  private syncService: SyncService;
  private azureDevOpsService: AzureDevOpsService;
  private mainWindow: BrowserWindow | null = null;

  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private lastSyncAt: Date | null = null;
  private nextSyncAt: Date | null = null;

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
    this.mainWindow = window;
    this.syncService.setMainWindow(window);
  }

  /** Start the 30-minute auto-sync timer */
  startAutoSync(): void {
    if (this.autoSyncTimer) return;
    this.scheduleNextSync();
    this.autoSyncTimer = setInterval(() => {
      this.runAutoSync();
    }, AUTO_SYNC_INTERVAL_MS);
    logger.info('[SyncController] Auto-sync started (every 30 min)');
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      this.nextSyncAt = null;
      logger.info('[SyncController] Auto-sync stopped');
    }
  }

  private scheduleNextSync(): void {
    this.nextSyncAt = new Date(Date.now() + AUTO_SYNC_INTERVAL_MS);
  }

  private async runAutoSync(): Promise<void> {
    try {
      const config = await this.azureDevOpsService.getConfig();
      if (!config) {
        logger.info(
          '[SyncController] Auto-sync skipped: Azure DevOps not configured',
        );
        this.scheduleNextSync();
        return;
      }
      if (this.isSyncing) {
        logger.info('[SyncController] Auto-sync skipped: already syncing');
        this.scheduleNextSync();
        return;
      }
      logger.info('[SyncController] Auto-sync triggered');
      await this.executeSyncInternal();
    } catch (error) {
      logger.error('[SyncController] Auto-sync error:', error);
    }
    this.scheduleNextSync();
  }

  private async executeSyncInternal(): Promise<FullSyncResult> {
    this.isSyncing = true;
    this.emitSyncStatus();
    try {
      const result = await this.syncService.fullSync();
      this.lastSyncAt = new Date();
      return result;
    } finally {
      this.isSyncing = false;
      this.emitSyncStatus();
    }
  }

  private emitSyncStatus(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.buildStatus().then((status) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('sync:status-changed', status);
        }
      });
    }
  }

  private async buildStatus(): Promise<SyncStatus> {
    let isConfigured = false;
    try {
      const config = await this.azureDevOpsService.getConfig();
      isConfigured = !!config;
    } catch {
      /* ignore */
    }
    return {
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: this.nextSyncAt?.toISOString() ?? null,
      isSyncing: this.isSyncing,
      isConfigured,
    };
  }

  @IpcMethod('sync:getStatus')
  async getSyncStatus(): Promise<ApiResponse<SyncStatus>> {
    const status = await this.buildStatus();
    return { success: true, data: status };
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

      if (this.isSyncing) {
        return {
          success: false,
          error: 'Sincronização já em andamento.',
        };
      }

      const result = await this.executeSyncInternal();
      // Reset the auto-sync timer after manual sync
      if (this.autoSyncTimer) {
        this.stopAutoSync();
        this.startAutoSync();
      }
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao executar sincronização completa com Azure DevOps';
      logger.error('SyncController.fullSync error:', error);
      this.isSyncing = false;
      this.emitSyncStatus();
      return { success: false, error: message };
    }
  }
}
