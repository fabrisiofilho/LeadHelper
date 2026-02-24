import { ipcMain } from 'electron';
import {
  TeamService,
  CreateTeamInput,
  UpdateTeamInput,
  TeamFilters,
} from '../services/team-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { tryCatch } from '@main/infrastructure/utils/try-catch';

const teamService = new TeamService();

export function registerTeamController(): void {
  ipcMain.handle(
    'team:create',
    async (_event, data: CreateTeamInput): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const team = await teamService.create(data);
        return team;
      }, 'Erro ao criar equipe');
    },
  );

  ipcMain.handle(
    'team:update',
    async (
      _event,
      id: number,
      data: UpdateTeamInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const team = await teamService.update(id, data);
        return team;
      }, 'Erro ao atualizar equipe');
    },
  );

  ipcMain.handle(
    'team:delete',
    async (_event, id: number): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await teamService.delete(id);
      }, 'Erro ao excluir equipe');
    },
  );

  ipcMain.handle(
    'team:findById',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const team = await teamService.findById(id);
        return team;
      }, 'Erro ao buscar equipe');
    },
  );

  ipcMain.handle(
    'team:findAll',
    async (_event, filters?: TeamFilters): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const teams = await teamService.findAll(filters);
        return teams;
      }, 'Erro ao listar equipes');
    },
  );

  ipcMain.handle(
    'team:activate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const team = await teamService.activate(id);
        return team;
      }, 'Erro ao ativar equipe');
    },
  );

  ipcMain.handle(
    'team:deactivate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const team = await teamService.deactivate(id);
        return team;
      }, 'Erro ao desativar equipe');
    },
  );

  ipcMain.handle(
    'team:addMember',
    async (
      _event,
      teamId: number,
      memberId: number,
    ): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await teamService.addMember(teamId, memberId);
      }, 'Erro ao adicionar membro à equipe');
    },
  );

  ipcMain.handle(
    'team:removeMember',
    async (
      _event,
      teamId: number,
      memberId: number,
    ): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await teamService.removeMember(teamId, memberId);
      }, 'Erro ao remover membro da equipe');
    },
  );

  logger.info('Team controller registered');
}
