import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { AllocationEntity } from './allocation.entity';
import type { SprintEntity } from './sprint.entity';
import type { TeamEntity } from './team.entity';
import type { TaskCommentEntity } from './task-comment.entity';
import { DateTransformer } from '../../infrastructure/database/date-transformer';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | (string & {});
export type TaskOrigin = 'manual' | 'azure_devops';
export type EstimationType = 'points' | 'hours';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType =
  | 'task'
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'support'
  | (string & {});

@Entity('tasks')
export class TaskEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: true,
    transformer: DateTransformer,
  })
  startDate?: Date;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    transformer: DateTransformer,
  })
  endDate?: Date;

  @Column({ type: 'text', default: 'pending' })
  status!: TaskStatus;

  @Column({ type: 'text', default: 'medium' })
  priority!: TaskPriority;

  @Column({ type: 'text', default: 'task' })
  type!: TaskType;

  @Column({ type: 'text', default: 'manual' })
  origin!: TaskOrigin;

  @Column({ name: 'external_id', type: 'text', nullable: true })
  externalId?: string;

  @Column({ name: 'external_source', type: 'text', nullable: true })
  externalSource?: string;

  @ManyToOne('SprintEntity', 'tasks')
  @JoinColumn({ name: 'sprint_id' })
  sprint?: SprintEntity;

  @Column({ name: 'sprint_id', nullable: true })
  sprintId?: number;

  @ManyToOne('TeamEntity', 'tasks')
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity;

  @Column({ name: 'team_id', nullable: true })
  teamId?: number;

  @Column({ name: 'estimation_points', type: 'real', nullable: true })
  estimationPoints?: number;

  @Column({ name: 'estimation_hours', type: 'real', nullable: true })
  estimationHours?: number;

  @Column({ name: 'estimation_type', type: 'text', nullable: true })
  estimationType?: EstimationType;

  @Column({ name: 'area_path', type: 'text', nullable: true })
  areaPath?: string;

  @Column({ name: 'iteration_path', type: 'text', nullable: true })
  iterationPath?: string;

  @Column({ name: 'tags', type: 'text', nullable: true })
  tags?: string;

  @Column({ name: 'story_points', type: 'real', nullable: true })
  storyPoints?: number;

  @Column({ name: 'original_work_item_type', type: 'text', nullable: true })
  originalWorkItemType?: string;

  @OneToMany('AllocationEntity', 'task')
  allocations?: AllocationEntity[];

  @OneToMany('TaskCommentEntity', 'task')
  comments?: TaskCommentEntity[];
}
