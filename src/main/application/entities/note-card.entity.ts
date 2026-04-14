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

  @Column({
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  deadline?: Date;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  completedAt?: Date;

  @OneToMany('NoteLinkEntity', 'noteCard')
  links?: NoteLinkEntity[];
}
