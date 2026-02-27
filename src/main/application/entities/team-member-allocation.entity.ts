import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { TeamMemberEntity } from './team-member.entity';
import type { TeamEntity } from './team.entity';
import { DateTransformer } from '../../infrastructure/database/date-transformer';

@Entity('team_member_allocations')
export class TeamMemberAllocationEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('TeamMemberEntity', 'teamAllocations')
  @JoinColumn({ name: 'team_member_id' })
  teamMember!: TeamMemberEntity;

  @Column({ name: 'team_member_id' })
  teamMemberId!: number;

  @ManyToOne('TeamEntity', 'memberAllocations')
  @JoinColumn({ name: 'team_id' })
  team!: TeamEntity;

  @Column({ name: 'team_id' })
  teamId!: number;

  @Column({ name: 'start_date', type: 'date', transformer: DateTransformer })
  startDate!: Date;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    transformer: DateTransformer,
  })
  endDate?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
