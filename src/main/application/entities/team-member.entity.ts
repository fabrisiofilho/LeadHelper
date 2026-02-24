import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { AllocationEntity } from './allocation.entity';
import type { PositionEntity } from './position.entity';
import type { TeamEntity } from './team.entity';
import type { TeamMemberAllocationEntity } from './team-member-allocation.entity';

export type TeamMemberRole =
  | 'developer'
  | 'analyst'
  | 'qa'
  | 'tech_lead'
  | 'devops'
  | 'designer'
  | 'product_owner';

@Entity('team_members')
export class TeamMemberEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text' })
  role!: TeamMemberRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'capacity_hours_per_day', type: 'real', default: 8 })
  capacityHoursPerDay!: number;

  @ManyToOne('PositionEntity', 'teamMembers')
  @JoinColumn({ name: 'position_id' })
  position?: PositionEntity;

  @Column({ name: 'position_id', nullable: true })
  positionId?: number;

  @ManyToMany('TeamEntity', 'members')
  @JoinTable({
    name: 'team_member_teams',
    joinColumn: { name: 'team_member_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams?: TeamEntity[];

  @OneToMany('AllocationEntity', 'teamMember')
  allocations?: AllocationEntity[];

  @OneToMany('TeamMemberAllocationEntity', 'teamMember')
  teamAllocations?: TeamMemberAllocationEntity[];
}
