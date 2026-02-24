import { ipcMain } from 'electron';
import {
  PositionService,
  CreatePositionInput,
  UpdatePositionInput,
  PositionFilters,
} from '../services/position-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { tryCatch } from '@main/infrastructure/utils/try-catch';

const positionService = new PositionService();

export function registerPositionController(): void {
  ipcMain.handle(
    'position:create',
    async (
      _event,
      data: CreatePositionInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const position = await positionService.create(data);
        return position;
      }, 'Erro ao criar cargo');
    },
  );

  ipcMain.handle(
    'position:update',
    async (
      _event,
      id: number,
      data: UpdatePositionInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const position = await positionService.update(id, data);
        return position;
      }, 'Erro ao atualizar cargo');
    },
  );

  ipcMain.handle(
    'position:delete',
    async (_event, id: number): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await positionService.delete(id);
      }, 'Erro ao excluir cargo');
    },
  );

  ipcMain.handle(
    'position:findById',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const position = await positionService.findById(id);
        return position;
      }, 'Erro ao buscar cargo');
    },
  );

  ipcMain.handle(
    'position:findAll',
    async (
      _event,
      filters?: PositionFilters,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const positions = await positionService.findAll(filters);
        return positions;
      }, 'Erro ao listar cargos');
    },
  );

  ipcMain.handle(
    'position:activate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const position = await positionService.activate(id);
        return position;
      }, 'Erro ao ativar cargo');
    },
  );

  ipcMain.handle(
    'position:deactivate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const position = await positionService.deactivate(id);
        return position;
      }, 'Erro ao desativar cargo');
    },
  );

  logger.info('Position controller registered');
}
