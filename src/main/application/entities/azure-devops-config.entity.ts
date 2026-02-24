import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from './config/auditable-entity';

@Entity('azure_devops_config')
export class AzureDevOpsConfigEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'organization_url', type: 'text' })
  organizationUrl!: string;

  @Column({ name: 'project_name', type: 'text' })
  projectName!: string;

  @Column({ name: 'pat_encrypted', type: 'text' })
  patEncrypted!: string;
}
