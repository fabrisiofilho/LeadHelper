import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import * as teamMemberService from '../services/team-member-service';
import type { TeamMemberFilters } from '../repositories/team-member-repository';
import type { TeamMemberRole } from '../entities/team-member.entity';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class TeamMemberController extends BaseHandler {
  private service: teamMemberService.TeamMemberService;

  constructor() {
    super();
    this.service = new teamMemberService.TeamMemberService();
  }

  @IpcMethod('team-member:create')
  async create(
    data: teamMemberService.CreateTeamMemberInput,
  ): Promise<ApiResponse<teamMemberService.TeamMember>> {
    try {
      const result = await this.service.create(data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao criar membro da equipe';
      logger.error('TeamMemberController.create error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('team-member:update')
  async update(
    id: number,
    data: teamMemberService.UpdateTeamMemberInput,
  ): Promise<ApiResponse<teamMemberService.TeamMember>> {
    try {
      const result = await this.service.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao atualizar membro da equipe';
      logger.error('TeamMemberController.update error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('team-member:deactivate')
  async deactivate(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.deactivate(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao desativar membro da equipe';
      logger.error('TeamMemberController.deactivate error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('team-member:activate')
  async activate(id: number): Promise<ApiResponse<void>> {
    try {
      await this.service.activate(id);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao ativar membro da equipe';
      logger.error('TeamMemberController.activate error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('team-member:findById')
  async findById(
    id: number,
  ): Promise<ApiResponse<teamMemberService.TeamMember | null>> {
    try {
      const result = await this.service.findById(id);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar membro da equipe';
      logger.error('TeamMemberController.findById error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('team-member:findAll')
  async findAll(
    filters?: TeamMemberFilters,
  ): Promise<ApiResponse<teamMemberService.TeamMember[]>> {
    try {
      const result = await this.service.findAll(filters);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao listar membros da equipe';
      logger.error('TeamMemberController.findAll error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('team-member:findByRole')
  async findByRole(
    role: TeamMemberRole,
  ): Promise<ApiResponse<teamMemberService.TeamMember[]>> {
    try {
      const result = await this.service.findByRole(role);
      return { success: true, data: result };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao buscar membros por função';
      logger.error('TeamMemberController.findByRole error:', error);
      return { success: false, error: message };
    }
  }
}
