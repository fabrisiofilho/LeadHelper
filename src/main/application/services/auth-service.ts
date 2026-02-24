import * as crypto from 'crypto';
import { UserRepository } from '../repositories/user-repository';
import { UserEntity } from '../entities/user.entity';
import {
  User,
  AuthData,
  RegisterInput,
  UpdateProfileInput,
} from '@shared/interfaces/types/auth.types';
import { logger } from '@main/infrastructure/log/logger';

export class AuthService {
  private static instance: AuthService;
  private repository: UserRepository;
  private currentUserId: number | null = null;

  private constructor() {
    this.repository = new UserRepository();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  private toUser(entity: UserEntity): User {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      createdAt: entity.createdAt || new Date(),
    };
  }

  async register(data: RegisterInput): Promise<User> {
    logger.info('Registering new user:', data.email);

    const existingUser = await this.repository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('E-mail já cadastrado');
    }

    const passwordHash = this.hashPassword(data.password);

    logger.info('Saving user to database...');
    const user = await this.repository.save({
      name: data.name,
      email: data.email,
      passwordHash,
    });

    logger.success('User registered successfully:', user.email, 'ID:', user.id);

    // Verify the user was actually saved
    const verifyUser = await this.repository.findByEmail(data.email);
    if (!verifyUser) {
      logger.error('CRITICAL: User was not persisted to database!');
      throw new Error('Falha ao persistir usuário no banco de dados');
    }
    logger.info('User verified in database:', verifyUser.id);

    return this.toUser(user);
  }

  async login(email: string, password: string): Promise<AuthData> {
    logger.info('Login attempt for:', email);

    const user = await this.repository.findByEmail(email);
    if (!user) {
      logger.warning('Login failed - user not found:', email);
      throw new Error('E-mail ou senha inválidos');
    }

    if (!this.verifyPassword(password, user.passwordHash)) {
      logger.warning('Login failed - invalid password:', email);
      throw new Error('E-mail ou senha inválidos');
    }

    this.currentUserId = user.id;
    logger.success('Login successful:', email);

    return {
      user: this.toUser(user),
      isAuthenticated: true,
    };
  }

  async logout(): Promise<void> {
    logger.info('User logging out');
    this.currentUserId = null;
  }

  async checkAuth(): Promise<boolean> {
    return this.currentUserId !== null;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.currentUserId) {
      return null;
    }

    const user = await this.repository.findOneBy({ id: this.currentUserId });
    if (!user) {
      this.currentUserId = null;
      return null;
    }

    return this.toUser(user);
  }

  async updateProfile(data: UpdateProfileInput): Promise<User> {
    if (!this.currentUserId) {
      throw new Error('Usuário não autenticado');
    }

    if (data.email) {
      const emailExists = await this.repository.emailExists(
        data.email,
        this.currentUserId,
      );
      if (emailExists) {
        throw new Error('E-mail já está em uso');
      }
    }

    await this.repository.update({ id: this.currentUserId }, data);

    const user = await this.repository.findOneBy({ id: this.currentUserId });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    logger.success('Profile updated for user:', user.email);
    return this.toUser(user);
  }

  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('Usuário não autenticado');
    }

    const user = await this.repository.findOneBy({ id: this.currentUserId });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (!this.verifyPassword(oldPassword, user.passwordHash)) {
      throw new Error('Senha atual incorreta');
    }

    const newPasswordHash = this.hashPassword(newPassword);
    await this.repository.updatePassword(this.currentUserId, newPasswordHash);
    logger.success('Password changed for user:', user.email);
  }
}
