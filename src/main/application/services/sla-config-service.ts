import {
  SlaConfigRepository,
  DEFAULT_SLA_HOURS,
  SLA_SUB_AREAS,
  SLA_PRIORITIES,
} from '../repositories/sla-config-repository';
import type {
  SlaConfigEntry,
  SlaProjectConfig,
  SaveSlaRulesInput,
} from '@shared/interfaces/config/index.types';
import type { SlaSubArea, SlaPriority } from '../entities/sla-config.entity';
import { logger } from '@main/infrastructure/log/logger';

export class SlaConfigService {
  private repo: SlaConfigRepository;

  constructor() {
    this.repo = new SlaConfigRepository();
  }

  /**
   * Returns the full SLA configuration grid for a project.
   * Guarantees 12 rows (3 sub-areas × 4 priorities), seeding defaults if needed.
   */
  async getByProject(configId: number): Promise<SlaProjectConfig> {
    logger.info('[SlaConfigService.getByProject]', { configId });
    const rows = await this.repo.findByProject(configId);

    // Build a complete grid, filling gaps with defaults
    const entries: SlaConfigEntry[] = [];
    for (const sa of SLA_SUB_AREAS) {
      for (const p of SLA_PRIORITIES) {
        const row = rows.find((r) => r.subArea === sa && r.priority === p);
        entries.push({
          subArea: sa,
          priority: p,
          hoursLimit: row?.hoursLimit ?? DEFAULT_SLA_HOURS[p as SlaPriority],
        });
      }
    }

    return { configId, entries };
  }

  /**
   * Saves all SLA rules for a project in one batch.
   */
  async saveRules(input: SaveSlaRulesInput): Promise<SlaProjectConfig> {
    logger.info('[SlaConfigService.saveRules]', {
      configId: input.configId,
      count: input.entries.length,
    });

    await this.repo.bulkUpsert(
      input.configId,
      input.entries.map((e) => ({
        subArea: e.subArea as SlaSubArea,
        priority: e.priority as SlaPriority,
        hoursLimit: e.hoursLimit,
      })),
    );

    return this.getByProject(input.configId);
  }

  /**
   * Returns a ready-to-use limits map for DashboardService.
   * Falls back to the static defaults for any missing entry.
   * Key format: `subArea:priority` → hoursLimit
   */
  async getLimitsMap(configId: number): Promise<Map<string, number>> {
    return this.repo.getLimitsMap(configId);
  }

  /**
   * Convenience: resolve the SLA limit for a specific task given its sub-area and priority.
   * Returns the static default if no project config exists.
   */
  async resolveLimit(
    configId: number | undefined,
    subArea: SlaSubArea,
    priority: SlaPriority,
  ): Promise<number> {
    if (!configId) return DEFAULT_SLA_HOURS[priority];
    const map = await this.getLimitsMap(configId);
    return map.get(`${subArea}:${priority}`) ?? DEFAULT_SLA_HOURS[priority];
  }
}
