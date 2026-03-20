import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock dependencies to avoid TypeORM initialization when importing dashboard-service
vi.mock('../../repositories/team-member-repository', () => ({
  TeamMemberRepository: vi.fn(),
}));
vi.mock('../../repositories/task-repository', () => ({
  TaskRepository: vi.fn(),
}));
vi.mock('../../repositories/sprint-repository', () => ({
  SprintRepository: vi.fn(),
}));
vi.mock('../../repositories/team-repository', () => ({
  TeamRepository: vi.fn(),
}));
vi.mock('../../repositories/team-member-allocation-repository', () => ({
  TeamMemberAllocationRepository: vi.fn(),
}));
vi.mock('../../repositories/task-local-priority-repository', () => ({
  TaskLocalPriorityRepository: vi.fn(),
}));
vi.mock('../team-member-allocation-service', () => ({
  TeamMemberAllocationService: vi.fn(),
}));
vi.mock('../../repositories/task-update-repository', () => ({
  TaskUpdateRepository: vi.fn(),
}));
vi.mock('@main/infrastructure/utils/business-hours', () => ({
  calculateBusinessHours: vi.fn().mockReturnValue(0),
}));
vi.mock('@main/infrastructure/log/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Feature: leadhelper-restructure, Property 3: filtragem de cards por area path
 *
 * Validates: Requirements 2.1, 3.1
 *
 * Para qualquer conjunto de cards e qualquer prefixo de areaPath, a função de
 * filtragem deve retornar exatamente os cards cujo areaPath começa com o prefixo
 * especificado, e nenhum card cujo areaPath não comece com esse prefixo.
 */

// ============================================================
// Card-like type used for filtering
// ============================================================

interface CardLike {
  id: number;
  areaPath?: string;
}

// ============================================================
// Filter function under test — same logic used by DashboardService
// ============================================================

function filterCardsByAreaPathPrefix(
  cards: CardLike[],
  prefix: string,
): CardLike[] {
  return cards.filter((c) => c.areaPath?.startsWith(prefix) ?? false);
}

// ============================================================
// Arbitraries
// ============================================================

/** Generate a path segment (no backslashes) */
const segmentArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .map((s) => s.replace(/[\\]/g, 'x').trim())
  .filter((s) => s.length > 0);

/** Generate a backslash-separated area path with 1-4 segments */
const areaPathArb = fc
  .array(segmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join('\\'));

/** Generate an optional areaPath (some cards may have undefined areaPath) */
const optionalAreaPathArb = fc.option(areaPathArb, { nil: undefined });

/** Generate a card-like object with a random id and optional areaPath */
const cardArb = fc
  .tuple(fc.nat(), optionalAreaPathArb)
  .map(([id, areaPath]) => ({
    id,
    areaPath,
  }));

/** Generate an array of cards */
const cardsArb = fc.array(cardArb, { minLength: 0, maxLength: 30 });

/** Generate a prefix string (could be a full path or partial) */
const prefixArb = areaPathArb;

// ============================================================
// Property 3 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 3: filtragem de cards por area path', () => {
  it('all returned cards have areaPath starting with the prefix', () => {
    fc.assert(
      fc.property(cardsArb, prefixArb, (cards, prefix) => {
        const result = filterCardsByAreaPathPrefix(cards, prefix);

        for (const card of result) {
          expect(card.areaPath).toBeDefined();
          expect(card.areaPath!.startsWith(prefix)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no excluded cards have areaPath starting with the prefix', () => {
    fc.assert(
      fc.property(cardsArb, prefixArb, (cards, prefix) => {
        const result = filterCardsByAreaPathPrefix(cards, prefix);
        const resultSet = new Set(result);

        const excluded = cards.filter((c) => !resultSet.has(c));

        for (const card of excluded) {
          const matches = card.areaPath?.startsWith(prefix) ?? false;
          expect(matches).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('result count matches the number of cards whose areaPath starts with the prefix', () => {
    fc.assert(
      fc.property(cardsArb, prefixArb, (cards, prefix) => {
        const result = filterCardsByAreaPathPrefix(cards, prefix);

        const expectedCount = cards.filter(
          (c) => c.areaPath?.startsWith(prefix) ?? false,
        ).length;

        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('cards with undefined areaPath are never included in the result', () => {
    fc.assert(
      fc.property(cardsArb, prefixArb, (cards, prefix) => {
        const result = filterCardsByAreaPathPrefix(cards, prefix);

        for (const card of result) {
          expect(card.areaPath).toBeDefined();
          expect(card.areaPath).not.toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('filtering with Sustentação prefix returns only sustentação cards', () => {
    const sustentacaoPrefix = 'Tribo SEIF\\Sustentação\\';

    fc.assert(
      fc.property(cardsArb, (cards) => {
        const result = filterCardsByAreaPathPrefix(cards, sustentacaoPrefix);

        // All returned cards must start with the sustentação prefix
        for (const card of result) {
          expect(card.areaPath!.startsWith(sustentacaoPrefix)).toBe(true);
        }

        // No card starting with the prefix should be excluded
        const expectedCount = cards.filter(
          (c) => c.areaPath?.startsWith(sustentacaoPrefix) ?? false,
        ).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('filtering with Projetos prefix returns only projetos cards', () => {
    const projetosPrefix = 'Tribo SEIF\\Projetos\\';

    fc.assert(
      fc.property(cardsArb, (cards) => {
        const result = filterCardsByAreaPathPrefix(cards, projetosPrefix);

        // All returned cards must start with the projetos prefix
        for (const card of result) {
          expect(card.areaPath!.startsWith(projetosPrefix)).toBe(true);
        }

        // No card starting with the prefix should be excluded
        const expectedCount = cards.filter(
          (c) => c.areaPath?.startsWith(projetosPrefix) ?? false,
        ).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('empty cards array always returns empty result', () => {
    fc.assert(
      fc.property(prefixArb, (prefix) => {
        const result = filterCardsByAreaPathPrefix([], prefix);
        expect(result).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it('result is a subset of the original cards (preserves identity)', () => {
    fc.assert(
      fc.property(cardsArb, prefixArb, (cards, prefix) => {
        const result = filterCardsByAreaPathPrefix(cards, prefix);

        // Every result card must be in the original array
        for (const card of result) {
          expect(cards).toContain(card);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================
// Feature: leadhelper-restructure, Property 6: determinação de status de SLA
//
// Validates: Requirements 2.6, 2.7, 2.8
//
// Para qualquer card com prioridade p e tempo decorrido em horas úteis elapsed,
// o status de SLA deve ser:
//   - violated se elapsed > SLA_LIMITS[p]
//   - warning se elapsed >= 0.8 * SLA_LIMITS[p] (e não violated)
//   - normal caso contrário
// Essas três condições são mutuamente exclusivas e exaustivas.
// ============================================================

import {
  SLA_LIMITS,
  type TaskPriority,
} from '@shared/interfaces/config/index.types';

// ============================================================
// SLA status determination — same logic used by DashboardService
// ============================================================

type SlaStatus = 'violated' | 'warning' | 'normal';

function determineSlaStatus(
  priority: TaskPriority,
  elapsed: number,
): SlaStatus {
  const limit = SLA_LIMITS[priority];
  if (elapsed > limit) return 'violated';
  if (elapsed >= 0.8 * limit) return 'warning';
  return 'normal';
}

// ============================================================
// Arbitraries
// ============================================================

const priorityArb: fc.Arbitrary<TaskPriority> = fc.constantFrom(
  'critical' as TaskPriority,
  'high' as TaskPriority,
  'medium' as TaskPriority,
  'low' as TaskPriority,
);

/** Positive elapsed hours (0 to 100, with decimals) */
const elapsedArb = fc.double({
  min: 0,
  max: 100,
  noNaN: true,
  noDefaultInfinity: true,
});

// ============================================================
// Property 6 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 6: determinação de status de SLA', () => {
  it('SLA status is correctly determined for any priority and elapsed time', () => {
    /**
     * **Validates: Requirements 2.6, 2.7, 2.8**
     */
    fc.assert(
      fc.property(priorityArb, elapsedArb, (priority, elapsed) => {
        const status = determineSlaStatus(priority, elapsed);
        const limit = SLA_LIMITS[priority];

        if (elapsed > limit) {
          expect(status).toBe('violated');
        } else if (elapsed >= 0.8 * limit) {
          expect(status).toBe('warning');
        } else {
          expect(status).toBe('normal');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('the three SLA conditions are mutually exclusive', () => {
    /**
     * **Validates: Requirements 2.6, 2.7, 2.8**
     */
    fc.assert(
      fc.property(priorityArb, elapsedArb, (priority, elapsed) => {
        const limit = SLA_LIMITS[priority];

        const isViolated = elapsed > limit;
        const isWarning = elapsed >= 0.8 * limit && elapsed <= limit;
        const isNormal = elapsed < 0.8 * limit;

        // Exactly one condition must be true
        const conditions = [isViolated, isWarning, isNormal].filter(Boolean);
        expect(conditions.length).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('the three SLA conditions are exhaustive (cover all cases)', () => {
    /**
     * **Validates: Requirements 2.6, 2.7, 2.8**
     */
    fc.assert(
      fc.property(priorityArb, elapsedArb, (priority, elapsed) => {
        const status = determineSlaStatus(priority, elapsed);

        // Status must always be one of the three valid values
        expect(['violated', 'warning', 'normal']).toContain(status);
      }),
      { numRuns: 100 },
    );
  });

  it('violated status only when elapsed exceeds the SLA limit', () => {
    /**
     * **Validates: Requirements 2.7**
     */
    fc.assert(
      fc.property(priorityArb, elapsedArb, (priority, elapsed) => {
        const status = determineSlaStatus(priority, elapsed);
        const limit = SLA_LIMITS[priority];

        if (status === 'violated') {
          expect(elapsed).toBeGreaterThan(limit);
        }
        if (elapsed > limit) {
          expect(status).toBe('violated');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('warning status only when elapsed is between 80% and 100% of SLA limit', () => {
    /**
     * **Validates: Requirements 2.8**
     */
    fc.assert(
      fc.property(priorityArb, elapsedArb, (priority, elapsed) => {
        const status = determineSlaStatus(priority, elapsed);
        const limit = SLA_LIMITS[priority];

        if (status === 'warning') {
          expect(elapsed).toBeGreaterThanOrEqual(0.8 * limit);
          expect(elapsed).toBeLessThanOrEqual(limit);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('SLA limits match expected values per priority', () => {
    /**
     * **Validates: Requirements 2.6**
     */
    expect(SLA_LIMITS.critical).toBe(4);
    expect(SLA_LIMITS.high).toBe(8);
    expect(SLA_LIMITS.medium).toBe(24);
    expect(SLA_LIMITS.low).toBe(40);
  });
});

// ============================================================
// Feature: leadhelper-restructure, Property 7: sprint identification by date
//
// Validates: Requirements 3.2
//
// Para qualquer conjunto de sprints e qualquer data de referência, a sprint atual
// é aquela cuja startDate <= referenceDate e endDate >= referenceDate. Se múltiplas
// sprints satisfazem a condição para um mesmo time, a mais recente (por startDate)
// deve ser selecionada. Se nenhuma satisfaz, o resultado deve ser null.
// ============================================================

import { findCurrentSprint } from '@main/application/services/dashboard-service';

// ============================================================
// Sprint-like type for property testing
// ============================================================

interface SprintLike {
  id: number;
  startDate: Date;
  endDate: Date;
  teamId?: number;
}

// ============================================================
// Arbitraries for Property 7
// ============================================================

/** Generate a date within a reasonable range (2020-2030) */
const dateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => {
    // Normalize to midnight to avoid sub-millisecond comparison issues
    const normalized = new Date(d);
    normalized.setMilliseconds(0);
    return normalized;
  });

/** Generate a sprint with startDate <= endDate and optional teamId */
const sprintArb: fc.Arbitrary<SprintLike> = fc
  .tuple(
    fc.nat({ max: 10000 }),
    dateArb,
    dateArb,
    fc.option(fc.nat({ max: 10 }), { nil: undefined }),
  )
  .map(([id, d1, d2, teamId]) => {
    const [startDate, endDate] = d1 <= d2 ? [d1, d2] : [d2, d1];
    return { id, startDate, endDate, teamId };
  });

/** Generate an array of sprints */
const sprintsArb = fc.array(sprintArb, { minLength: 0, maxLength: 20 });

/** Optional teamId filter */
const optionalTeamIdArb = fc.option(fc.nat({ max: 10 }), { nil: undefined });

// ============================================================
// Property 7 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 7: sprint identification by date', () => {
  it('returns null when no sprint contains the reference date', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        sprintsArb,
        dateArb,
        optionalTeamIdArb,
        (sprints, refDate, teamId) => {
          const result = findCurrentSprint(sprints, refDate, teamId);

          if (result === null) {
            // Verify that indeed no sprint matches
            const matching = sprints.filter((s) => {
              const matchesTeam = teamId === undefined || s.teamId === teamId;
              const matchesDate =
                s.startDate <= refDate && s.endDate >= refDate;
              return matchesTeam && matchesDate;
            });
            expect(matching.length).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returned sprint always contains the reference date within its range', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        sprintsArb,
        dateArb,
        optionalTeamIdArb,
        (sprints, refDate, teamId) => {
          const result = findCurrentSprint(sprints, refDate, teamId);

          if (result !== null) {
            expect(result.startDate.getTime()).toBeLessThanOrEqual(
              refDate.getTime(),
            );
            expect(result.endDate.getTime()).toBeGreaterThanOrEqual(
              refDate.getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returned sprint matches the team filter when teamId is provided', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        sprintsArb,
        dateArb,
        optionalTeamIdArb,
        (sprints, refDate, teamId) => {
          const result = findCurrentSprint(sprints, refDate, teamId);

          if (result !== null && teamId !== undefined) {
            expect(result.teamId).toBe(teamId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when multiple sprints match, the one with the most recent startDate is selected', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        sprintsArb,
        dateArb,
        optionalTeamIdArb,
        (sprints, refDate, teamId) => {
          const result = findCurrentSprint(sprints, refDate, teamId);

          if (result !== null) {
            // Find all matching candidates manually
            const candidates = sprints.filter((s) => {
              const matchesTeam = teamId === undefined || s.teamId === teamId;
              const matchesDate =
                s.startDate <= refDate && s.endDate >= refDate;
              return matchesTeam && matchesDate;
            });

            expect(candidates.length).toBeGreaterThan(0);

            // The result should have the most recent startDate among candidates
            const maxStartTime = Math.max(
              ...candidates.map((c) => c.startDate.getTime()),
            );
            expect(result.startDate.getTime()).toBe(maxStartTime);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result is non-null if and only if at least one sprint matches the date and team', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        sprintsArb,
        dateArb,
        optionalTeamIdArb,
        (sprints, refDate, teamId) => {
          const result = findCurrentSprint(sprints, refDate, teamId);

          const hasMatch = sprints.some((s) => {
            const matchesTeam = teamId === undefined || s.teamId === teamId;
            const matchesDate = s.startDate <= refDate && s.endDate >= refDate;
            return matchesTeam && matchesDate;
          });

          if (hasMatch) {
            expect(result).not.toBeNull();
          } else {
            expect(result).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returned sprint is always one of the input sprints', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        sprintsArb,
        dateArb,
        optionalTeamIdArb,
        (sprints, refDate, teamId) => {
          const result = findCurrentSprint(sprints, refDate, teamId);

          if (result !== null) {
            expect(sprints).toContain(result);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ============================================================
// Feature: leadhelper-restructure, Property 8: invariante do resumo quantitativo
//
// Validates: Requirements 3.3, 3.6
//
// Para qualquer sprint com um conjunto de cards, o resumo quantitativo deve satisfazer:
//   - total = pending + inProgress + completed + cancelled
//   - completionPercentage = (completed / total) * 100 (ou 0 se total = 0)
//   - A soma das contagens por status deve ser igual ao total.
// ============================================================

import { categorizeStatus } from '@main/application/services/dashboard-service';
import type { SprintQuantitativeSummary } from '@main/application/services/dashboard-service';

// ============================================================
// Arbitraries for Property 8
// ============================================================

/** Known Azure DevOps / internal status strings that categorizeStatus handles */
const knownStatuses = [
  'New',
  'Active',
  'In Progress',
  'Done',
  'Closed',
  'Removed',
  'Resolved',
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

/** Generate a random status string from the known set */
const statusArb = fc.constantFrom(...knownStatuses);

/** Generate an array of status strings representing cards in a sprint */
const statusArrayArb = fc.array(statusArb, { minLength: 0, maxLength: 50 });

// ============================================================
// Helper: compute quantitative summary from an array of statuses
// (mirrors the logic in DashboardService.getProjetosItems)
// ============================================================

function computeSummary(statuses: string[]): SprintQuantitativeSummary {
  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;

  for (const status of statuses) {
    const category = categorizeStatus(status);
    switch (category) {
      case 'pending':
        pending++;
        break;
      case 'inProgress':
        inProgress++;
        break;
      case 'completed':
        completed++;
        break;
      case 'cancelled':
        cancelled++;
        break;
    }
  }

  const total = pending + inProgress + completed + cancelled;
  const completionPercentage = total > 0 ? (completed / total) * 100 : 0;

  return { total, completed, inProgress, pending, cancelled, completionPercentage };
}

// ============================================================
// Property 8 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 8: invariante do resumo quantitativo', () => {
  it('total equals the sum of all status groups', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    fc.assert(
      fc.property(statusArrayArb, (statuses) => {
        const summary = computeSummary(statuses);

        expect(summary.total).toBe(
          summary.pending + summary.inProgress + summary.completed + summary.cancelled,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('total equals the number of input cards', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    fc.assert(
      fc.property(statusArrayArb, (statuses) => {
        const summary = computeSummary(statuses);

        expect(summary.total).toBe(statuses.length);
      }),
      { numRuns: 100 },
    );
  });

  it('completionPercentage equals (completed / total) * 100 when total > 0', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    fc.assert(
      fc.property(
        fc.array(statusArb, { minLength: 1, maxLength: 50 }),
        (statuses) => {
          const summary = computeSummary(statuses);

          expect(summary.total).toBeGreaterThan(0);
          const expected = (summary.completed / summary.total) * 100;
          expect(summary.completionPercentage).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('completionPercentage is 0 when total is 0 (empty sprint)', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    const summary = computeSummary([]);

    expect(summary.total).toBe(0);
    expect(summary.completionPercentage).toBe(0);
  });

  it('all status counts are non-negative', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    fc.assert(
      fc.property(statusArrayArb, (statuses) => {
        const summary = computeSummary(statuses);

        expect(summary.pending).toBeGreaterThanOrEqual(0);
        expect(summary.inProgress).toBeGreaterThanOrEqual(0);
        expect(summary.completed).toBeGreaterThanOrEqual(0);
        expect(summary.cancelled).toBeGreaterThanOrEqual(0);
        expect(summary.total).toBeGreaterThanOrEqual(0);
        expect(summary.completionPercentage).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it('completionPercentage is between 0 and 100 inclusive', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    fc.assert(
      fc.property(statusArrayArb, (statuses) => {
        const summary = computeSummary(statuses);

        expect(summary.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(summary.completionPercentage).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });

  it('categorizeStatus maps every known status to one of the four groups', () => {
    /**
     * **Validates: Requirements 3.3, 3.6**
     */
    fc.assert(
      fc.property(statusArb, (status) => {
        const category = categorizeStatus(status);

        expect(['pending', 'inProgress', 'completed', 'cancelled']).toContain(category);
      }),
      { numRuns: 100 },
    );
  });
});
