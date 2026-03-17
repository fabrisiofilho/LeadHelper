import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import { TeamEntity } from './team.entity';
import type { TaskEntity } from './task.entity';
import { DateTransformer } from '../../infrastructure/database/date-transformer';

@Entity('sprints')
export class SprintEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'start_date', type: 'date', transformer: DateTransformer })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', transformer: DateTransformer })
  endDate!: Date;

  @ManyToOne('TeamEntity', 'sprints')
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity;

  @Column({ name: 'team_id', type: 'integer', nullable: true })
  teamId?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'iteration_path', type: 'text', nullable: true })
  iterationPath?: string;

  @OneToMany('TaskEntity', 'sprint')
  tasks?: TaskEntity[];
}
