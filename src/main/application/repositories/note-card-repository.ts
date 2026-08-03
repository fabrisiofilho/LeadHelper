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

  /**
   * Find all active notes that have a start_date (i.e. they have a period).
   * Used for Gantt rendering.
   */
  async findWithPeriod(): Promise<NoteCardEntity[]> {
    return await this.repository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.links', 'links')
      .where('note.start_date IS NOT NULL')
      .andWhere('note.completed_at IS NULL')
      .orderBy('note.start_date', 'ASC')
      .getMany();
  }

  /**
   * Find notes with a period within a given date range.
   * Includes notes whose period overlaps with [rangeStart, rangeEnd].
   */
  async findInDateRange(
    rangeStart: Date,
    rangeEnd: Date,
    includeCompleted = false,
  ): Promise<NoteCardEntity[]> {
    const qb = this.repository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.links', 'links')
      .where('note.start_date IS NOT NULL')
      // Overlaps: note.start_date <= rangeEnd AND note.deadline >= rangeStart
      .andWhere('note.start_date <= :rangeEnd', {
        rangeEnd: rangeEnd.toISOString(),
      })
      .andWhere('(note.deadline >= :rangeStart OR note.deadline IS NULL)', {
        rangeStart: rangeStart.toISOString(),
      });

    if (!includeCompleted) {
      qb.andWhere('note.completed_at IS NULL');
    }

    return qb.orderBy('note.start_date', 'ASC').getMany();
  }
}
