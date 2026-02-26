import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { SprintEntity } from './sprint.entity';
import type { TaskEntity } from './task.entity';
import type { TeamMemberEntity } from './team-member.entity';
import type { TeamMemberAllocationEntity } from './team-member-allocation.entity';

@Entity('teams')
export class TeamEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', default: '#2196F3' })
  color!: string;

  @Column({ name: 'azure_area_path', type: 'text', nullable: true })
  azureAreaPath?: string;

  @OneToMany('SprintEntity', 'team')
  sprints?: SprintEntity[];

  @OneToMany('TaskEntity', 'team')
  tasks?: TaskEntity[];

  @ManyToMany('TeamMemberEntity', 'teams')
  members?: TeamMemberEntity[];

  @OneToMany('TeamMemberAllocationEntity', 'team')
  memberAllocations?: TeamMemberAllocationEntity[];
}
