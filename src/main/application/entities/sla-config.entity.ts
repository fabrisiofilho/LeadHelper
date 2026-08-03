import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

export type SlaSubArea = 'gestao_terceiros' | 'chamada_tecnologica' | 'outros';
export type SlaPriority = 'critical' | 'high' | 'medium' | 'low';

@Entity('sla_configs')
export class SlaConfigEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'azure_devops_config_id', type: 'integer' })
  azureDevOpsConfigId!: number;

  @Column({ name: 'sub_area', type: 'text' })
  subArea!: SlaSubArea;

  @Column({ name: 'priority', type: 'text' })
  priority!: SlaPriority;

  /** Maximum business hours before SLA violation */
  @Column({ name: 'hours_limit', type: 'real' })
  hoursLimit!: number;
}
