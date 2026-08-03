import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { TeamMemberService } from '../services/team-member-service';
import type {
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  TeamMember,
} from '../services/team-member-service';
import type { TeamMemberFilters } from '../repositories/team-member-repository';
import type { TeamMemberRole } from '../entities/team-member.entity';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';

export class TeamMemberController extends BaseHandler {
  private service: TeamMemberService;

  constructor() {
    super();
    this.service = new TeamMemberService();
  }

  @IpcMethod('team-member:create')
  async create(data: CreateTeamMemberInput): Promise<ApiResponse<TeamMember>> {
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
    data: UpdateTeamMemberInput,
  ): Promise<ApiResponse<TeamMember>> {
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
  async findById(id: number): Promise<ApiResponse<TeamMember | null>> {
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
  ): Promise<ApiResponse<TeamMember[]>> {
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
  async findByRole(role: TeamMemberRole): Promise<ApiResponse<TeamMember[]>> {
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

  @IpcMethod('team-member:importPositions')
  async importPositions(
    rows: Array<{ email: string; positionId: number }>,
  ): Promise<ApiResponse<{ updated: number; errors: string[] }>> {
    try {
      let updated = 0;
      const errors: string[] = [];
      for (const row of rows) {
        try {
          const member = await this.service.findByEmail(row.email);
          if (!member) {
            errors.push(`Membro com email "${row.email}" não encontrado`);
            continue;
          }
          await this.service.update(member.id, { positionId: row.positionId });
          updated++;
        } catch (err) {
          errors.push(
            `Erro ao atualizar "${row.email}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          );
        }
      }
      return { success: true, data: { updated, errors } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao importar cargos';
      logger.error('TeamMemberController.importPositions error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Import positions from CSV and deactivate members whose emails are NOT
   * present in the CSV list (i.e. they have left the team).
   *
   * @param rows        - Pairs of { email, positionId } from the CSV
   * @param allCsvEmails - All email addresses present in the CSV file
   *                      (used to determine who should be deactivated)
   */
  @IpcMethod('team-member:importPositionsWithDeactivation')
  async importPositionsWithDeactivation(
    rows: Array<{ email: string; positionId: number }>,
    allCsvEmails: string[],
  ): Promise<
    ApiResponse<{ updated: number; deactivated: number; errors: string[] }>
  > {
    try {
      let updated = 0;
      let deactivated = 0;
      const errors: string[] = [];

      // 1. Update positions for members in the CSV
      for (const row of rows) {
        try {
          const member = await this.service.findByEmail(row.email);
          if (!member) {
            errors.push(`Membro com email "${row.email}" não encontrado`);
            continue;
          }
          await this.service.update(member.id, { positionId: row.positionId });
          updated++;
        } catch (err) {
          errors.push(
            `Erro ao atualizar "${row.email}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          );
        }
      }

      // 2. Deactivate active members whose emails are NOT in the CSV
      const csvEmailsLower = new Set(
        allCsvEmails.map((e) => e.trim().toLowerCase()),
      );
      const allActiveMembers = await this.service.findAll({ isActive: true });

      for (const member of allActiveMembers) {
        if (!member.email) continue;
        if (!csvEmailsLower.has(member.email.toLowerCase())) {
          try {
            await this.service.deactivate(member.id);
            deactivated++;
          } catch (err) {
            errors.push(
              `Erro ao inativar "${member.email}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
            );
          }
        }
      }

      return { success: true, data: { updated, deactivated, errors } };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao importar cargos com inativação';
      logger.error(
        'TeamMemberController.importPositionsWithDeactivation error:',
        error,
      );
      return { success: false, error: message };
    }
  }
}
