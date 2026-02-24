import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { AutoUpdaterService } from '@main/infrastructure/auto-updater/auto-updater-service';
import { UpdateState } from '@shared/interfaces/types/auto-updater.types';
import { UpdateInfo } from 'electron-updater';

export class AutoUpdaterController extends BaseHandler {
  private service: AutoUpdaterService;

  constructor() {
    super();
    this.service = AutoUpdaterService.getInstance();
  }

  @IpcMethod('autoUpdater:getAppVersion')
  async getAppVersion(): Promise<string> {
    return this.service.getAppVersion();
  }

  @IpcMethod('autoUpdater:checkForUpdates')
  async checkForUpdates(): Promise<UpdateInfo | null> {
    return this.service.checkForUpdates();
  }

  @IpcMethod('autoUpdater:downloadUpdate')
  async downloadUpdate(): Promise<void> {
    return this.service.downloadUpdate();
  }

  @IpcMethod('autoUpdater:installUpdate')
  async installUpdate(): Promise<void> {
    this.service.installUpdate();
  }

  @IpcMethod('autoUpdater:getUpdateState')
  async getUpdateState(): Promise<UpdateState> {
    return this.service.getUpdateState();
  }
}
