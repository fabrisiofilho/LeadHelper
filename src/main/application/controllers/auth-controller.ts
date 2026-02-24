import { IpcMethod } from '@main/infrastructure/decorators/ipc.decorator';
import { BaseHandler } from './config/base-handler';
import { AuthService } from '../services/auth-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import type {
  User,
  AuthData,
  RegisterInput,
  UpdateProfileInput,
} from '@shared/interfaces/types/auth.types';
import { logger } from '@main/infrastructure/log/logger';

export class AuthController extends BaseHandler {
  private service: AuthService;

  constructor() {
    super();
    this.service = AuthService.getInstance();
  }

  @IpcMethod('auth:register')
  async register(data: RegisterInput): Promise<ApiResponse<User>> {
    try {
      const user = await this.service.register(data);
      return { success: true, data: user };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao criar conta';
      logger.error('AuthController.register error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('auth:login')
  async login(email: string, password: string): Promise<ApiResponse<AuthData>> {
    try {
      const authData = await this.service.login(email, password);
      return { success: true, data: authData };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao fazer login';
      logger.error('AuthController.login error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('auth:logout')
  async logout(): Promise<ApiResponse<void>> {
    try {
      await this.service.logout();
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao fazer logout';
      logger.error('AuthController.logout error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('auth:checkAuth')
  async checkAuth(): Promise<ApiResponse<boolean>> {
    try {
      const isAuthenticated = await this.service.checkAuth();
      return { success: true, data: isAuthenticated };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao verificar autenticação';
      logger.error('AuthController.checkAuth error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('auth:getCurrentUser')
  async getCurrentUser(): Promise<ApiResponse<User | null>> {
    try {
      const user = await this.service.getCurrentUser();
      return { success: true, data: user };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao obter usuário atual';
      logger.error('AuthController.getCurrentUser error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('auth:updateProfile')
  async updateProfile(data: UpdateProfileInput): Promise<ApiResponse<User>> {
    try {
      const user = await this.service.updateProfile(data);
      return { success: true, data: user };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar perfil';
      logger.error('AuthController.updateProfile error:', error);
      return { success: false, error: message };
    }
  }

  @IpcMethod('auth:changePassword')
  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<void>> {
    try {
      await this.service.changePassword(oldPassword, newPassword);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao alterar senha';
      logger.error('AuthController.changePassword error:', error);
      return { success: false, error: message };
    }
  }
}
