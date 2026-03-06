import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

@Entity('task_local_priority')
export class TaskLocalPriorityEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'external_id', type: 'text', unique: true })
  externalId!: string; // ID do work item no Azure DevOps

  @Column({ name: 'local_priority', type: 'integer', default: 0 })
  localPriority!: number; // 0-5, onde 5 é mais urgente

  // createdAt e updatedAt herdados de AuditableEntity
}
