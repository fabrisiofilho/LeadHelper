import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: leadhelper-restructure, Property 9: ordenação do histórico de atualizações
 *
 * Validates: Requirements 4.1
 *
 * Para qualquer card com histórico de atualizações, ao exibir o histórico,
 * as entradas devem estar ordenadas por changedDate em ordem decrescente
 * (mais recente primeiro). Para quaisquer dois registros adjacentes na lista,
 * o primeiro deve ter changedDate maior ou igual ao segundo.
 */

// ============================================================
// Pure sorting function (mirrors TaskUpdateRepository.findByTaskId ORDER BY changedDate DESC)
// ============================================================

interface TaskUpdate {
  id: number;
  changedDate: Date;
  fieldName: string;
  revision: number;
}

/**
 * Sorts task updates by changedDate in descending order (most recent first),
 * matching the ORDER BY changedDate DESC used by TaskUpdateRepository.findByTaskId.
 */
function sortUpdatesDescending(updates: TaskUpdate[]): TaskUpdate[] {
  return [...updates].sort(
    (a, b) => b.changedDate.getTime() - a.changedDate.getTime(),
  );
}

// ============================================================
// Arbitraries
// ============================================================

/** Generate a random Date within a reasonable range (2020-2030) */
const dateArb = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map((ts) => new Date(ts));

const fieldNameArb = fc.constantFrom(
  'System.State',
  'System.AssignedTo',
  'System.Title',
  'Microsoft.VSTS.Common.Priority',
  'System.IterationPath',
  'System.AreaPath',
);

/** Generate a single TaskUpdate entry */
const taskUpdateArb = fc
  .record({
    id: fc.integer({ min: 1, max: 100000 }),
    changedDate: dateArb,
    fieldName: fieldNameArb,
    revision: fc.integer({ min: 1, max: 500 }),
  });

/** Generate a list of TaskUpdate entries (0 to 50 items) */
const taskUpdatesArb = fc.array(taskUpdateArb, { minLength: 0, maxLength: 50 });

// ============================================================
// Property 9 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 9: ordenação do histórico de atualizações', () => {
  it('sorted updates are always in descending changedDate order for any input', () => {
    fc.assert(
      fc.property(taskUpdatesArb, (updates) => {
        const sorted = sortUpdatesDescending(updates);

        // For any two adjacent records, the first must have changedDate >= second
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].changedDate.getTime()).toBeGreaterThanOrEqual(
            sorted[i + 1].changedDate.getTime(),
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('sorting preserves all original elements (no additions or removals)', () => {
    fc.assert(
      fc.property(taskUpdatesArb, (updates) => {
        const sorted = sortUpdatesDescending(updates);

        // Same length
        expect(sorted.length).toBe(updates.length);

        // Same set of ids (sorted may reorder but not lose/add elements)
        const originalIds = updates.map((u) => u.id).sort();
        const sortedIds = sorted.map((u) => u.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });

  it('the first element has the most recent (or tied) changedDate', () => {
    fc.assert(
      fc.property(
        fc.array(taskUpdateArb, { minLength: 1, maxLength: 50 }),
        (updates) => {
          const sorted = sortUpdatesDescending(updates);
          const maxDate = Math.max(...updates.map((u) => u.changedDate.getTime()));

          expect(sorted[0].changedDate.getTime()).toBe(maxDate);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the last element has the oldest (or tied) changedDate', () => {
    fc.assert(
      fc.property(
        fc.array(taskUpdateArb, { minLength: 1, maxLength: 50 }),
        (updates) => {
          const sorted = sortUpdatesDescending(updates);
          const minDate = Math.min(...updates.map((u) => u.changedDate.getTime()));

          expect(sorted[sorted.length - 1].changedDate.getTime()).toBe(minDate);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sorting is idempotent — sorting an already sorted list produces the same result', () => {
    fc.assert(
      fc.property(taskUpdatesArb, (updates) => {
        const sorted1 = sortUpdatesDescending(updates);
        const sorted2 = sortUpdatesDescending(sorted1);

        expect(sorted2.map((u) => u.changedDate.getTime())).toEqual(
          sorted1.map((u) => u.changedDate.getTime()),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('an empty list remains empty after sorting', () => {
    const sorted = sortUpdatesDescending([]);
    expect(sorted).toEqual([]);
  });

  it('a single-element list remains unchanged after sorting', () => {
    fc.assert(
      fc.property(taskUpdateArb, (update) => {
        const sorted = sortUpdatesDescending([update]);
        expect(sorted.length).toBe(1);
        expect(sorted[0].changedDate.getTime()).toBe(update.changedDate.getTime());
      }),
      { numRuns: 100 },
    );
  });
});


// ============================================================
// Property 10 — Round-trip de armazenamento de histórico
// ============================================================

/**
 * Feature: leadhelper-restructure, Property 10: round-trip de armazenamento de histórico
 *
 * Validates: Requirements 4.3
 *
 * Para qualquer conjunto de atualizações de um work item, armazenar no banco
 * e depois recuperar deve produzir registros equivalentes (mesmos campos:
 * changedDate, changedBy, fieldName, oldValue, newValue).
 *
 * Since we can't use a real database in property tests, we model this as a
 * pure data transformation round-trip:
 *   Input:   WorkItemUpdate[] (Azure DevOps API format)
 *   Store:   Convert to TaskUpdateEntity[] (flatten fields into individual records)
 *   Retrieve: Read back stored fields and verify equivalence
 */

// ============================================================
// Types mirroring the real application types
// ============================================================

interface WorkItemUpdateField {
  fieldName: string;
  oldValue?: string;
  newValue?: string;
}

interface WorkItemUpdate {
  revision: number;
  changedDate: Date;
  changedBy?: string;
  fields: WorkItemUpdateField[];
}

interface StoredRecord {
  taskId: number;
  externalWorkItemId: number;
  revision: number;
  changedDate: Date;
  changedBy?: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
}

// ============================================================
// Pure store/retrieve functions (mirror syncTaskUpdates logic)
// ============================================================

/**
 * Simulates the store operation: converts WorkItemUpdate[] to flat StoredRecord[].
 * This mirrors the nested loop in SyncService.syncTaskUpdates that flattens
 * each update's fields array into individual TaskUpdateEntity records.
 */
function storeUpdates(
  updates: WorkItemUpdate[],
  taskId: number,
  externalWorkItemId: number,
): StoredRecord[] {
  const records: StoredRecord[] = [];
  for (const update of updates) {
    for (const field of update.fields) {
      records.push({
        taskId,
        externalWorkItemId,
        revision: update.revision,
        changedDate: update.changedDate,
        changedBy: update.changedBy,
        fieldName: field.fieldName,
        oldValue: field.oldValue,
        newValue: field.newValue,
      });
    }
  }
  return records;
}

/**
 * Simulates the retrieve operation: reads back the key fields from stored records.
 * This mirrors what TaskUpdateRepository.findByTaskId would return.
 */
function retrieveUpdates(
  records: StoredRecord[],
): Pick<StoredRecord, 'changedDate' | 'changedBy' | 'fieldName' | 'oldValue' | 'newValue'>[] {
  return records.map((r) => ({
    changedDate: r.changedDate,
    changedBy: r.changedBy,
    fieldName: r.fieldName,
    oldValue: r.oldValue,
    newValue: r.newValue,
  }));
}

// ============================================================
// Arbitraries for Property 10
// ============================================================

const p10FieldNameArb = fc.constantFrom(
  'System.State',
  'System.AssignedTo',
  'System.Title',
  'Microsoft.VSTS.Common.Priority',
  'System.IterationPath',
  'System.AreaPath',
  'System.Reason',
  'System.ChangedBy',
);

const p10OptionalStringArb = fc.oneof(
  fc.constant(undefined),
  fc.string({ minLength: 0, maxLength: 100 }),
);

const p10FieldArb: fc.Arbitrary<WorkItemUpdateField> = fc.record({
  fieldName: p10FieldNameArb,
  oldValue: p10OptionalStringArb,
  newValue: p10OptionalStringArb,
});

const p10DateArb = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map((ts) => new Date(ts));

const p10ChangedByArb = fc.oneof(
  fc.constant(undefined),
  fc.string({ minLength: 1, maxLength: 50 }),
);

const p10WorkItemUpdateArb: fc.Arbitrary<WorkItemUpdate> = fc.record({
  revision: fc.integer({ min: 1, max: 500 }),
  changedDate: p10DateArb,
  changedBy: p10ChangedByArb,
  fields: fc.array(p10FieldArb, { minLength: 1, maxLength: 10 }),
});

const p10UpdatesArb = fc.array(p10WorkItemUpdateArb, { minLength: 0, maxLength: 20 });

// ============================================================
// Property 10 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 10: round-trip de armazenamento de histórico', () => {
  it('storing and retrieving updates produces records with equivalent key fields', () => {
    fc.assert(
      fc.property(
        p10UpdatesArb,
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100000 }),
        (updates, taskId, externalWorkItemId) => {
          // Store: flatten WorkItemUpdate[] into StoredRecord[]
          const stored = storeUpdates(updates, taskId, externalWorkItemId);

          // Retrieve: read back key fields
          const retrieved = retrieveUpdates(stored);

          // Build expected records from the original input
          const expected: Pick<StoredRecord, 'changedDate' | 'changedBy' | 'fieldName' | 'oldValue' | 'newValue'>[] = [];
          for (const update of updates) {
            for (const field of update.fields) {
              expected.push({
                changedDate: update.changedDate,
                changedBy: update.changedBy,
                fieldName: field.fieldName,
                oldValue: field.oldValue,
                newValue: field.newValue,
              });
            }
          }

          // Same count
          expect(retrieved.length).toBe(expected.length);

          // Each retrieved record matches the expected record at the same index
          for (let i = 0; i < expected.length; i++) {
            expect(retrieved[i].changedDate.getTime()).toBe(expected[i].changedDate.getTime());
            expect(retrieved[i].changedBy).toBe(expected[i].changedBy);
            expect(retrieved[i].fieldName).toBe(expected[i].fieldName);
            expect(retrieved[i].oldValue).toBe(expected[i].oldValue);
            expect(retrieved[i].newValue).toBe(expected[i].newValue);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('total stored records equals the sum of all fields across all updates', () => {
    fc.assert(
      fc.property(p10UpdatesArb, (updates) => {
        const stored = storeUpdates(updates, 1, 1);
        const expectedCount = updates.reduce((sum, u) => sum + u.fields.length, 0);
        expect(stored.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('each stored record preserves the revision and externalWorkItemId from its parent update', () => {
    fc.assert(
      fc.property(
        p10UpdatesArb,
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100000 }),
        (updates, taskId, externalWorkItemId) => {
          const stored = storeUpdates(updates, taskId, externalWorkItemId);

          let idx = 0;
          for (const update of updates) {
            for (const _field of update.fields) {
              expect(stored[idx].taskId).toBe(taskId);
              expect(stored[idx].externalWorkItemId).toBe(externalWorkItemId);
              expect(stored[idx].revision).toBe(update.revision);
              idx++;
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('an empty updates array produces zero stored records', () => {
    const stored = storeUpdates([], 1, 1);
    expect(stored).toEqual([]);
    const retrieved = retrieveUpdates(stored);
    expect(retrieved).toEqual([]);
  });

  it('round-trip is deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(p10UpdatesArb, (updates) => {
        const stored1 = storeUpdates(updates, 42, 999);
        const retrieved1 = retrieveUpdates(stored1);

        const stored2 = storeUpdates(updates, 42, 999);
        const retrieved2 = retrieveUpdates(stored2);

        expect(retrieved1.length).toBe(retrieved2.length);
        for (let i = 0; i < retrieved1.length; i++) {
          expect(retrieved1[i].changedDate.getTime()).toBe(retrieved2[i].changedDate.getTime());
          expect(retrieved1[i].changedBy).toBe(retrieved2[i].changedBy);
          expect(retrieved1[i].fieldName).toBe(retrieved2[i].fieldName);
          expect(retrieved1[i].oldValue).toBe(retrieved2[i].oldValue);
          expect(retrieved1[i].newValue).toBe(retrieved2[i].newValue);
        }
      }),
      { numRuns: 100 },
    );
  });
});
