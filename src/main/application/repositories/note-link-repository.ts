import { Repository } from 'typeorm';
import { NoteLinkEntity } from '../entities/note-link.entity';
import { getDataSource } from '@main/infrastructure/database/data-source';

export class NoteLinkRepository {
  private _repository: Repository<NoteLinkEntity> | null = null;

  private get repository(): Repository<NoteLinkEntity> {
    if (!this._repository) {
      this._repository = getDataSource().getRepository(NoteLinkEntity);
    }
    return this._repository;
  }

  async createLinks(
    links: Partial<NoteLinkEntity>[],
  ): Promise<NoteLinkEntity[]> {
    if (links.length === 0) return [];
    const entities = links.map((link) => this.repository.create(link));
    return this.repository.save(entities);
  }

  async deleteByNoteCardId(noteCardId: number): Promise<void> {
    await this.repository.delete({ noteCardId });
  }

  async findByNoteCardId(noteCardId: number): Promise<NoteLinkEntity[]> {
    return this.repository.find({
      where: { noteCardId },
      order: { id: 'ASC' },
    });
  }
}
