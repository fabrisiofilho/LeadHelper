import { ipcMain } from 'electron';
import {
  SprintService,
  CreateSprintInput,
  UpdateSprintInput,
} from '../services/sprint-service';
import { SprintFilters } from '../repositories/sprint-repository';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { tryCatch } from '@main/infrastructure/utils/try-catch';

const sprintService = new SprintService();

export function registerSprintController(): void {
  ipcMain.handle(
    'sprint:create',
    async (_event, data: CreateSprintInput): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprint = await sprintService.create(data);
        return sprint;
      }, 'Erro ao criar sprint');
    },
  );

  ipcMain.handle(
    'sprint:update',
    async (
      _event,
      id: number,
      data: UpdateSprintInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprint = await sprintService.update(id, data);
        return sprint;
      }, 'Erro ao atualizar sprint');
    },
  );

  ipcMain.handle(
    'sprint:delete',
    async (_event, id: number): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await sprintService.delete(id);
      }, 'Erro ao excluir sprint');
    },
  );

  ipcMain.handle(
    'sprint:findById',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprint = await sprintService.findById(id);
        return sprint;
      }, 'Erro ao buscar sprint');
    },
  );

  ipcMain.handle(
    'sprint:findAll',
    async (_event, filters?: SprintFilters): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprints = await sprintService.findAll(filters);
        return sprints;
      }, 'Erro ao listar sprints');
    },
  );

  ipcMain.handle(
    'sprint:findByTeam',
    async (_event, teamId: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprints = await sprintService.findByTeam(teamId);
        return sprints;
      }, 'Erro ao buscar sprints da equipe');
    },
  );

  ipcMain.handle(
    'sprint:findCurrent',
    async (_event, teamId?: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprint = await sprintService.findCurrentSprint(teamId);
        return sprint;
      }, 'Erro ao buscar sprint atual');
    },
  );

  ipcMain.handle(
    'sprint:findUpcoming',
    async (
      _event,
      teamId?: number,
      limit?: number,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprints = await sprintService.findUpcomingSprints(teamId, limit);
        return sprints;
      }, 'Erro ao buscar próximas sprints');
    },
  );

  ipcMain.handle(
    'sprint:activate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprint = await sprintService.activate(id);
        return sprint;
      }, 'Erro ao ativar sprint');
    },
  );

  ipcMain.handle(
    'sprint:deactivate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const sprint = await sprintService.deactivate(id);
        return sprint;
      }, 'Erro ao desativar sprint');
    },
  );

  logger.info('Sprint controller registered');
}
