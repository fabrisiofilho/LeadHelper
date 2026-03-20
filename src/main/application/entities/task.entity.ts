import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { SprintEntity } from './sprint.entity';
import type { TeamEntity } from './team.entity';
import type { TaskCommentEntity } from './task-comment.entity';
import { DateTransformer } from '../../infrastructure/database/date-transformer';
import { DateTimeTransformer } from '../../infrastructure/database/datetime-transformer';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | (string & {});
export type TaskOrigin = 'manual' | 'azure_devops';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
// TaskType uses Azure DevOps work item types directly (Epic, Feature, User Story, Task, Bug, etc.)
export type TaskType = string;

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

  @Column({ type: 'text', default: 'Task' })
  type!: TaskType;

  @Column({ type: 'text', default: 'manual' })
  origin!: TaskOrigin;

  @Column({ name: 'external_id', type: 'text', nullable: true })
  externalId?: string;

  @ManyToOne('SprintEntity', 'tasks')
  @JoinColumn({ name: 'sprint_id' })
  sprint?: SprintEntity;

  @Column({ name: 'sprint_id', type: 'integer', nullable: true })
  sprintId?: number;

  @ManyToOne('TeamEntity', 'tasks')
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity;

  @Column({ name: 'team_id', type: 'integer', nullable: true })
  teamId?: number;

  @Column({ name: 'area_path', type: 'text', nullable: true })
  areaPath?: string;

  @Column({ name: 'iteration_path', type: 'text', nullable: true })
  iterationPath?: string;

  @Column({ name: 'tags', type: 'text', nullable: true })
  tags?: string;

  @Column({ name: 'story_points', type: 'real', nullable: true })
  storyPoints?: number;

  @Column({ name: 'assigned_to_name', type: 'text', nullable: true })
  assignedToName?: string;

  @Column({ name: 'assigned_to_email', type: 'text', nullable: true })
  assignedToEmail?: string;

  @Column({
    name: 'azure_created_date',
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  azureCreatedDate?: Date;

  @Column({
    name: 'azure_changed_date',
    type: 'datetime',
    nullable: true,
    transformer: DateTimeTransformer,
  })
  azureChangedDate?: Date;

  @Column({ name: 'azure_priority', type: 'integer', nullable: true })
  azurePriority?: number;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId?: number;

  @ManyToOne('TaskEntity', 'children')
  @JoinColumn({ name: 'parent_id' })
  parent?: TaskEntity;

  @OneToMany('TaskEntity', 'parent')
  children?: TaskEntity[];

  @Column({ name: 'work_item_relations', type: 'text', nullable: true })
  workItemRelations?: string; // JSON string with relations data

  @OneToMany('TaskCommentEntity', 'task')
  comments?: TaskCommentEntity[];
}
