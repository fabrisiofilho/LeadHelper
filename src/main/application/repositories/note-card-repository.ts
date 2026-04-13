import { IsNull, Not, EntityManager } from 'typeorm';
import { BaseRepository } from './base-repository';
import { NoteCardEntity } from '../entities/note-card.entity';

export class NoteCardRepository extends BaseRepository<NoteCardEntity> {
  constructor(manager?: EntityManager) {
    super(NoteCardEntity, manager);
  }

  async findAllActive(): Promise<NoteCardEntity[]> {
    return await this.find({
      where: { completedAt: IsNull() },
      relations: ['links'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllCompleted(): Promise<NoteCardEntity[]> {
    return await this.find({
      where: { completedAt: Not(IsNull()) },
      relations: ['links'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdWithLinks(id: number): Promise<NoteCardEntity | null> {
    return await this.findOne({
      where: { id },
      relations: ['links'],
    });
  }
}
