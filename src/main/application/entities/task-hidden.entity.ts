import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

@Entity('task_hidden')
export class TaskHiddenEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'external_id', type: 'text', unique: true })
  externalId!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;
}
