import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { PositionEntity } from './position.entity';
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

  @Column({ name: 'azure_unique_id', type: 'text', nullable: true })
  azureUniqueId?: string;

  @Column({ name: 'position_id', type: 'integer', nullable: true })
  positionId?: number;

  @OneToMany('TeamMemberAllocationEntity', 'teamMember')
  teamAllocations?: TeamMemberAllocationEntity[];
}
