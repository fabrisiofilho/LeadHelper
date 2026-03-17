import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { TaskEntity } from './task.entity';

@Entity('task_comments')
export class TaskCommentEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  author?: string;

  @ManyToOne('TaskEntity', 'comments')
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @Column({ name: 'task_id', type: 'integer' })
  taskId!: number;
}
