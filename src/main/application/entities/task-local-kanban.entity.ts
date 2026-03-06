import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

@Entity('task_local_kanban')
export class TaskLocalKanbanEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'external_id', type: 'text', unique: true })
  externalId!: string; // ID do work item no Azure DevOps

  @Column({ name: 'local_column', type: 'text' })
  localColumn!: string; // Coluna simulada (To Do, In Progress, Done)

  @Column({ name: 'local_order', type: 'integer', default: 0 })
  localOrder!: number; // Ordem dentro da coluna

  // createdAt e updatedAt herdados de AuditableEntity
}
