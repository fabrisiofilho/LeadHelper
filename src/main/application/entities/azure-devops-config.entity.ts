import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

@Entity('azure_devops_config')
export class AzureDevOpsConfigEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName?: string;

  @Column({ name: 'organization_url', type: 'text' })
  organizationUrl!: string;

  @Column({ name: 'project_name', type: 'text' })
  projectName!: string;

  @Column({ name: 'pat_encrypted', type: 'text' })
  patEncrypted!: string;

  @Column({ name: 'sustentacao_area_path', type: 'text', nullable: true })
  sustentacaoAreaPath?: string;

  @Column({ name: 'projetos_area_path', type: 'text', nullable: true })
  projetosAreaPath?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
