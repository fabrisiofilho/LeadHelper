import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

@Entity('task_status_config')
export class TaskStatusConfigEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text' })
  label!: string;

  @Column({ type: 'text', default: '#9e9e9e' })
  color!: string;

  @Column({ name: 'order', type: 'integer', default: 0 })
  order!: number;

  @Column({ name: 'show_in_kanban', type: 'boolean', default: true })
  showInKanban!: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;
}
