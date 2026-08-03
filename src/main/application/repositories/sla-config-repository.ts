import { BaseRepository } from './base-repository';
import {
  SlaConfigEntity,
  SlaSubArea,
  SlaPriority,
} from '../entities/sla-config.entity';

/** Default fallback limits — mirror the static SLA_LIMITS constant */
export const DEFAULT_SLA_HOURS: Record<SlaPriority, number> = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 40,
};

export const SLA_SUB_AREAS: SlaSubArea[] = [
  'gestao_terceiros',
  'chamada_tecnologica',
  'outros',
];

export const SLA_PRIORITIES: SlaPriority[] = [
  'critical',
  'high',
  'medium',
  'low',
];

export class SlaConfigRepository extends BaseRepository<SlaConfigEntity> {
  constructor() {
    super(SlaConfigEntity);
  }

  /**
   * Returns all SLA configs for a given project.
   * If rows are missing (project just created), they are seeded with defaults first.
   */
  async findByProject(configId: number): Promise<SlaConfigEntity[]> {
    let rows = await this.find({
      where: { azureDevOpsConfigId: configId },
      order: { subArea: 'ASC', priority: 'ASC' },
    });

    // If no rows exist yet, seed defaults and re-fetch
    if (rows.length === 0) {
      await this.seedDefaults(configId);
      rows = await this.find({
        where: { azureDevOpsConfigId: configId },
        order: { subArea: 'ASC', priority: 'ASC' },
      });
    }

    return rows;
  }

  /**
   * Upsert a single SLA rule.
   */
  async upsert(
    configId: number,
    subArea: SlaSubArea,
    priority: SlaPriority,
    hoursLimit: number,
  ): Promise<SlaConfigEntity> {
    const existing = await this.findOne({
      where: {
        azureDevOpsConfigId: configId,
        subArea,
        priority,
      },
    });

    if (existing) {
      existing.hoursLimit = hoursLimit;
      return this.save(existing);
    }

    return this.save({
      azureDevOpsConfigId: configId,
      subArea,
      priority,
      hoursLimit,
    } as Partial<SlaConfigEntity>);
  }

  /**
   * Bulk upsert: replaces all SLA rules for a project with the provided values.
   * Input: flat array of { subArea, priority, hoursLimit }.
   */
  async bulkUpsert(
    configId: number,
    rules: { subArea: SlaSubArea; priority: SlaPriority; hoursLimit: number }[],
  ): Promise<void> {
    for (const rule of rules) {
      await this.upsert(configId, rule.subArea, rule.priority, rule.hoursLimit);
    }
  }

  /**
   * Build a lookup map: `subArea:priority` → hoursLimit.
   * Falls back to DEFAULT_SLA_HOURS for any missing combination.
   */
  async getLimitsMap(configId: number): Promise<Map<string, number>> {
    const rows = await this.findByProject(configId);
    const map = new Map<string, number>();

    for (const row of rows) {
      map.set(`${row.subArea}:${row.priority}`, row.hoursLimit);
    }

    // Fill missing combinations with defaults
    for (const sa of SLA_SUB_AREAS) {
      for (const p of SLA_PRIORITIES) {
        const key = `${sa}:${p}`;
        if (!map.has(key)) {
          map.set(key, DEFAULT_SLA_HOURS[p]);
        }
      }
    }

    return map;
  }

  /** Seeds the 12 default rows (3 sub-areas × 4 priorities) for a new project. */
  async seedDefaults(configId: number): Promise<void> {
    for (const sa of SLA_SUB_AREAS) {
      for (const p of SLA_PRIORITIES) {
        await this.upsert(configId, sa, p, DEFAULT_SLA_HOURS[p]);
      }
    }
  }
}
