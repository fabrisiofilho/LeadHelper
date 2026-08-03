import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { NoteLinkEntity } from './note-link.entity';
import { DateTimeTransformer } from '../../infrastructure/database/datetime-transformer';

@Entity('note_cards')
export class NoteCardEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  /**
   * Optional start of the period. When set together with `deadline`, the note
   * represents a time-boxed event or allocation on the Gantt.
   * When all_day is false, the time component carries meaning (e.g. 14:00–17:30).
   */
  @Column({
    name: 'start_date',
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  startDate?: Date | null;

  /**
   * When true (default), only the date portion matters — times are hidden
   * in the UI and the Gantt shows full-day blocks.
   */
  @Column({ name: 'all_day', type: 'boolean', default: true })
  allDay!: boolean;

  /**
   * Explicit date mode chosen by the user.
   * 'none'   = no date
   * 'single' = single date/datetime
   * 'period' = date range (startDate → deadline)
   */
  @Column({ name: 'date_mode', type: 'text', default: 'none' })
  dateMode!: string;

  @Column({
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  deadline?: Date | null;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  completedAt?: Date | null;

  @OneToMany('NoteLinkEntity', 'noteCard')
  links?: NoteLinkEntity[];
}
