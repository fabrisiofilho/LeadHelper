import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { NoteCardEntity } from './note-card.entity';

export type NoteLinkEntityType = 'team_member' | 'team' | 'position' | 'task';

@Entity('note_links')
export class NoteLinkEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'note_card_id', type: 'integer' })
  noteCardId!: number;

  @ManyToOne('NoteCardEntity', 'links')
  @JoinColumn({ name: 'note_card_id' })
  noteCard?: NoteCardEntity;

  @Column({ name: 'entity_type', type: 'text' })
  entityType!: NoteLinkEntityType;

  @Column({ name: 'entity_id', type: 'integer' })
  entityId!: number;
}
