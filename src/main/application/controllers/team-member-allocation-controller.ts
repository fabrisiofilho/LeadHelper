import { ipcMain } from 'electron';
import {
  TeamMemberAllocationService,
  CreateTeamMemberAllocationInput,
  UpdateTeamMemberAllocationInput,
} from '../services/team-member-allocation-service';
import { TeamMemberAllocationFilters } from '../repositories/team-member-allocation-repository';
import { GanttService, GanttFilters } from '../services/gantt-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { tryCatch } from '@main/infrastructure/utils/try-catch';

const service = new TeamMemberAllocationService();
const ganttService = new GanttService();

export function registerTeamMemberAllocationController(): void {
  ipcMain.handle(
    'team-member-allocation:create',
    async (
      _event,
      data: CreateTeamMemberAllocationInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocation = await service.create(data);
        return allocation;
      }, 'Erro ao criar alocação de membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:update',
    async (
      _event,
      id: number,
      data: UpdateTeamMemberAllocationInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocation = await service.update(id, data);
        return allocation;
      }, 'Erro ao atualizar alocação de membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:delete',
    async (_event, id: number): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await service.delete(id);
      }, 'Erro ao excluir alocação de membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:deactivate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocation = await service.deactivate(id);
        return allocation;
      }, 'Erro ao desativar alocação de membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:findById',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocation = await service.findById(id);
        return allocation;
      }, 'Erro ao buscar alocação de membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:findByTeam',
    async (_event, teamId: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocations = await service.findByTeam(teamId);
        return allocations;
      }, 'Erro ao buscar alocações da equipe');
    },
  );

  ipcMain.handle(
    'team-member-allocation:findByTeamMember',
    async (_event, teamMemberId: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocations = await service.findByTeamMember(teamMemberId);
        return allocations;
      }, 'Erro ao buscar alocações do membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:findActiveByTeam',
    async (
      _event,
      teamId: number,
      referenceDate?: Date,
    ): Promise<ApiResponse<unknown>> => {
      logger.info('[findActiveByTeam] Called with:', {
        teamId,
        referenceDate,
        referenceDateType: typeof referenceDate,
      });
      return tryCatch(async () => {
        const allocations = await service.findActiveByTeam(
          teamId,
          referenceDate,
        );
        logger.info('[findActiveByTeam] Result count:', {
          count: allocations.length,
          teamId,
        });
        return allocations;
      }, 'Erro ao buscar alocações ativas da equipe');
    },
  );

  ipcMain.handle(
    'team-member-allocation:findActiveByTeamMember',
    async (
      _event,
      teamMemberId: number,
      referenceDate?: Date,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocations = await service.findActiveByTeamMember(
          teamMemberId,
          referenceDate,
        );
        return allocations;
      }, 'Erro ao buscar alocações ativas do membro');
    },
  );

  ipcMain.handle(
    'team-member-allocation:findAll',
    async (
      _event,
      filters?: TeamMemberAllocationFilters,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const allocations = await service.findAll(filters);
        return allocations;
      }, 'Erro ao listar alocações de membros');
    },
  );

  ipcMain.handle(
    'team-member-allocation:getTeamCapacity',
    async (
      _event,
      teamId: number,
      referenceDate?: Date,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const capacity = await service.getTeamCapacity(teamId, referenceDate);
        return capacity;
      }, 'Erro ao obter capacidade da equipe');
    },
  );

  ipcMain.handle(
    'team-member-allocation:getMemberAvailability',
    async (
      _event,
      teamMemberId: number,
      referenceDate?: Date,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const availability = await service.getMemberAvailability(
          teamMemberId,
          referenceDate,
        );
        return availability;
      }, 'Erro ao obter disponibilidade do membro');
    },
  );

  ipcMain.handle(
    'allocation:getGanttData',
    async (_event, filters: GanttFilters): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const data = await ganttService.getGanttData(filters);
        return data;
      }, 'Erro ao buscar dados do Gantt');
    },
  );

  ipcMain.handle(
    'allocation:detectConflicts',
    async (_event, teamMemberId?: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const conflicts = await service.detectAllocationConflicts(teamMemberId);
        return conflicts;
      }, 'Erro ao detectar conflitos de alocação');
    },
  );

  logger.info('Team member allocation controller registered');
}
