import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { TaskEntity } from './task.entity';

@Entity('task_updates')
export class TaskUpdateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'task_id', type: 'integer' })
  taskId!: number;

  @ManyToOne('TaskEntity')
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @Column({ name: 'external_work_item_id', type: 'integer' })
  externalWorkItemId!: number;

  @Column({ name: 'revision', type: 'integer' })
  revision!: number;

  @Column({ name: 'changed_date', type: 'datetime' })
  changedDate!: Date;

  @Column({ name: 'changed_by', type: 'text', nullable: true })
  changedBy?: string;

  @Column({ name: 'field_name', type: 'text' })
  fieldName!: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue?: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue?: string;
}
