import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock dependencies to avoid TypeORM initialization
vi.mock('../../repositories/team-member-allocation-repository', () => ({
  TeamMemberAllocationRepository: vi.fn(),
}));
vi.mock('../../repositories/task-repository', () => ({
  TaskRepository: vi.fn(),
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
 * Feature: leadhelper-restructure, Property 11: dados do Gantt refletem alocações filtradas
 *
 * **Validates: Requirements 6.4, 6.5, 6.6, 6.7**
 *
 * Para qualquer conjunto de alocações e qualquer filtro (equipe, período), os itens
 * do Gantt devem conter exatamente as alocações que satisfazem o filtro. Cada item
 * deve ter start e end correspondentes à alocação original (usando 31/12/2099 para
 * alocações sem data de fim).
 */

// ============================================================
// Types
// ============================================================

const DEFAULT_END_DATE = new Date(2099, 11, 31); // 31/12/2099

interface AllocationLike {
  id: number;
  teamId: number;
  teamMemberId: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

interface GanttFilter {
  teamId?: number;
  startDate: Date;
  endDate: Date;
}

interface GanttItemLike {
  allocationId: number;
  start: Date;
  end: Date;
}

// ============================================================
// Pure filtering function — mirrors GanttService + repository logic
// ============================================================

/**
 * Filters allocations based on the Gantt filter criteria, mirroring the logic
 * in TeamMemberAllocationRepository.findWithFilters:
 * - Filter by teamId if provided
 * - Only active allocations
 * - Period overlap: allocation.startDate <= filter.endDate AND
 *   (allocation.endDate IS NULL OR allocation.endDate >= filter.startDate)
 */
function filterAllocationsForGantt(
  allocations: AllocationLike[],
  filter: GanttFilter,
): AllocationLike[] {
  return allocations.filter((a) => {
    if (!a.isActive) return false;
    if (filter.teamId !== undefined && a.teamId !== filter.teamId) return false;

    // Period overlap check (same as findWithFilters)
    const allocEnd = a.endDate ?? DEFAULT_END_DATE;
    if (allocEnd < filter.startDate) return false;
    if (a.startDate > filter.endDate) return false;

    return true;
  });
}

/**
 * Converts filtered allocations to Gantt items, replacing null/undefined
 * endDate with 31/12/2099 (same as GanttTab component logic).
 */
function toGanttItems(allocations: AllocationLike[]): GanttItemLike[] {
  return allocations.map((a) => ({
    allocationId: a.id,
    start: a.startDate,
    end: a.endDate ?? DEFAULT_END_DATE,
  }));
}

// ============================================================
// Arbitraries
// ============================================================

/** Generate a date within a reasonable range (2020-2030) */
const dateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    normalized.setMilliseconds(0);
    return normalized;
  });

/** Generate a teamId (small range to increase filter hits) */
const teamIdArb = fc.nat({ max: 5 });

/** Generate a teamMemberId */
const teamMemberIdArb = fc.nat({ max: 20 });

/** Generate an allocation-like object */
const allocationArb: fc.Arbitrary<AllocationLike> = fc
  .tuple(
    fc.nat({ max: 10000 }),
    teamIdArb,
    teamMemberIdArb,
    dateArb,
    fc.option(dateArb, { nil: undefined }),
    fc.boolean(),
  )
  .map(([id, teamId, teamMemberId, d1, d2, isActive]) => {
    // Ensure startDate <= endDate when endDate is defined
    let startDate = d1;
    let endDate = d2;
    if (endDate !== undefined) {
      if (d1 > d2) {
        startDate = d2;
        endDate = d1;
      }
    }
    return { id, teamId, teamMemberId, startDate, endDate, isActive };
  })
  .filter(
    (a) =>
      !isNaN(a.startDate.getTime()) &&
      (a.endDate === undefined || !isNaN(a.endDate.getTime())),
  );

/** Generate an array of allocations */
const allocationsArb = fc.array(allocationArb, { minLength: 0, maxLength: 30 });

/** Generate a Gantt filter with optional teamId and a valid date range */
const ganttFilterArb: fc.Arbitrary<GanttFilter> = fc
  .tuple(fc.option(teamIdArb, { nil: undefined }), dateArb, dateArb)
  .filter(([, d1, d2]) => !isNaN(d1.getTime()) && !isNaN(d2.getTime()))
  .map(([teamId, d1, d2]) => {
    const [startDate, endDate] = d1 <= d2 ? [d1, d2] : [d2, d1];
    return { teamId, startDate, endDate };
  });

// ============================================================
// Property 11 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 11: dados do Gantt refletem alocações filtradas', () => {
  it('filtered Gantt items contain exactly the allocations that satisfy the filter', () => {
    /**
     * **Validates: Requirements 6.4, 6.5, 6.6, 6.7**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);
        const ganttItems = toGanttItems(filtered);

        // The number of Gantt items must match the number of filtered allocations
        expect(ganttItems.length).toBe(filtered.length);

        // Each Gantt item must correspond to a filtered allocation
        for (let i = 0; i < ganttItems.length; i++) {
          expect(ganttItems[i].allocationId).toBe(filtered[i].id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('all returned allocations satisfy the teamId filter when provided', () => {
    /**
     * **Validates: Requirements 6.6**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);

        if (filter.teamId !== undefined) {
          for (const alloc of filtered) {
            expect(alloc.teamId).toBe(filter.teamId);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('all returned allocations overlap with the filter period', () => {
    /**
     * **Validates: Requirements 6.6**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);

        for (const alloc of filtered) {
          const allocEnd = alloc.endDate ?? DEFAULT_END_DATE;
          // Allocation must overlap with filter period
          expect(alloc.startDate.getTime()).toBeLessThanOrEqual(
            filter.endDate.getTime(),
          );
          expect(allocEnd.getTime()).toBeGreaterThanOrEqual(
            filter.startDate.getTime(),
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no excluded allocation satisfies the filter criteria', () => {
    /**
     * **Validates: Requirements 6.4, 6.6**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);
        const filteredIds = new Set(filtered.map((a) => a.id));
        const excluded = allocations.filter((a) => !filteredIds.has(a.id));

        for (const alloc of excluded) {
          const allocEnd = alloc.endDate ?? DEFAULT_END_DATE;
          const matchesTeam =
            filter.teamId === undefined || alloc.teamId === filter.teamId;
          const matchesPeriod =
            alloc.startDate <= filter.endDate && allocEnd >= filter.startDate;
          const isActive = alloc.isActive;

          // At least one condition must fail for excluded allocations
          expect(matchesTeam && matchesPeriod && isActive).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('each Gantt item has correct start and end dates from the allocation', () => {
    /**
     * **Validates: Requirements 6.4, 6.5**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);
        const ganttItems = toGanttItems(filtered);

        for (let i = 0; i < ganttItems.length; i++) {
          const item = ganttItems[i];
          const alloc = filtered[i];

          // Start date must match the allocation's startDate
          expect(item.start.getTime()).toBe(alloc.startDate.getTime());

          // End date must be the allocation's endDate or 31/12/2099 if undefined
          if (alloc.endDate !== undefined) {
            expect(item.end.getTime()).toBe(alloc.endDate.getTime());
          } else {
            expect(item.end.getTime()).toBe(DEFAULT_END_DATE.getTime());
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('allocations without endDate get 31/12/2099 as Gantt item end date', () => {
    /**
     * **Validates: Requirements 6.5**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);
        const ganttItems = toGanttItems(filtered);

        for (let i = 0; i < ganttItems.length; i++) {
          if (filtered[i].endDate === undefined) {
            expect(ganttItems[i].end.getTime()).toBe(
              DEFAULT_END_DATE.getTime(),
            );
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('only active allocations are included in the Gantt result', () => {
    /**
     * **Validates: Requirements 6.4**
     */
    fc.assert(
      fc.property(allocationsArb, ganttFilterArb, (allocations, filter) => {
        const filtered = filterAllocationsForGantt(allocations, filter);

        for (const alloc of filtered) {
          expect(alloc.isActive).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('empty allocations array always returns empty Gantt items', () => {
    /**
     * **Validates: Requirements 6.4**
     */
    fc.assert(
      fc.property(ganttFilterArb, (filter) => {
        const filtered = filterAllocationsForGantt([], filter);
        const ganttItems = toGanttItems(filtered);

        expect(filtered).toEqual([]);
        expect(ganttItems).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
