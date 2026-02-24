import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';
import type { TeamMemberEntity } from './team-member.entity';

@Entity('positions')
export class PositionEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('TeamMemberEntity', 'position')
  teamMembers?: TeamMemberEntity[];
}
