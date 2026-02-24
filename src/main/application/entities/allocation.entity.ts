import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import { TeamMemberEntity } from './team-member.entity';
import { TaskEntity } from './task.entity';
import { DateTransformer } from '../../infrastructure/database/date-transformer';

@Entity('allocations')
export class AllocationEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('TeamMemberEntity', 'allocations')
  @JoinColumn({ name: 'team_member_id' })
  teamMember!: TeamMemberEntity;

  @Column({ name: 'team_member_id' })
  teamMemberId!: number;

  @ManyToOne('TaskEntity', 'allocations')
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @Column({ name: 'task_id' })
  taskId!: number;

  @Column({ name: 'start_date', type: 'date', transformer: DateTransformer })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', transformer: DateTransformer })
  endDate!: Date;
}
