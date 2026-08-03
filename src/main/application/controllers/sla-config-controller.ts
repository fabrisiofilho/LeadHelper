import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { SlaConfigService } from '../services/sla-config-service';
import type {
  SlaProjectConfig,
  SaveSlaRulesInput,
} from '@shared/interfaces/config/index.types';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class SlaConfigController extends BaseHandler {
  private service: SlaConfigService;

  constructor() {
    super();
    this.service = new SlaConfigService();
  }

  @IpcMethod('sla-config:getByProject')
  async getByProject(configId: number): Promise<ApiResponse<SlaProjectConfig>> {
    try {
      const data = await this.service.getByProject(configId);
      return { success: true, data };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar configuração de SLA';
      logger.error('SlaConfigController.getByProject error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('sla-config:saveRules')
  async saveRules(
    input: SaveSlaRulesInput,
  ): Promise<ApiResponse<SlaProjectConfig>> {
    try {
      const data = await this.service.saveRules(input);
      return { success: true, data };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar regras de SLA';
      logger.error('SlaConfigController.saveRules error:', error);
      return { success: false, error: message };
    }
  }
}
