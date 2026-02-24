import { BaseRepository } from './base-repository';
import { UserEntity } from '../entities/user.entity';
import { EntityManager } from 'typeorm';

export class UserRepository extends BaseRepository<UserEntity> {
  constructor(manager?: EntityManager) {
    super(UserEntity, manager);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.findOneBy({ email });
  }

  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;
    if (excludeId !== undefined && user.id === excludeId) return false;
    return true;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.update({ id }, { passwordHash });
  }
}
