import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBusinessHours,
  addBusinessHours,
  isBusinessDay,
  HOURS_PER_DAY,
} from '@main/infrastructure/utils/business-hours';

/**
 * Feature: leadhelper-restructure, Property 4: cálculo de horas úteis
 *
 * Validates: Requirements 2.5, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * Para quaisquer duas datas start e end onde start <= end,
 * calculateBusinessHours(start, end) conta apenas tempo em horário útil
 * (seg-sex, 08:00-12:00, 13:30-17:30).
 */

// ============================================================
// Helpers
// ============================================================

/** Business hour intervals as minutes from midnight */
const MORNING_START_MIN = 8 * 60; // 480
const MORNING_END_MIN = 12 * 60; // 720
const AFTERNOON_START_MIN = 13 * 60 + 30; // 810
const AFTERNOON_END_MIN = 17 * 60 + 30; // 1050

/**
 * Reference implementation: counts business minutes between two dates
 * by iterating minute-by-minute.
 */
function referenceBusinessHours(start: Date, end: Date): number {
  if (start >= end) return 0;

  let businessMinutes = 0;
  const current = new Date(start);
  // Zero out seconds/ms for consistent minute stepping
  current.setSeconds(0, 0);

  const endTime = end.getTime();

  while (current.getTime() < endTime) {
    const day = current.getDay();
    const isWeekday = day >= 1 && day <= 5;

    if (isWeekday) {
      const mins = current.getHours() * 60 + current.getMinutes();
      const inMorning = mins >= MORNING_START_MIN && mins < MORNING_END_MIN;
      const inAfternoon =
        mins >= AFTERNOON_START_MIN && mins < AFTERNOON_END_MIN;
      if (inMorning || inAfternoon) {
        businessMinutes++;
      }
    }

    // Advance by 1 minute
    current.setTime(current.getTime() + 60_000);
  }

  return businessMinutes / 60;
}

/**
 * Count business days between two dates (inclusive of partial days).
 * Returns the number of Mon-Fri days that the range spans.
 */
function countBusinessDays(start: Date, end: Date): number {
  if (start >= end) return 0;
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (current <= endDay) {
    if (isBusinessDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ============================================================
// Arbitraries
// ============================================================

/** Generate a date within a reasonable range (2020-2030), aligned to minutes */
const dateArb = fc
  .integer({
    min: new Date(2020, 0, 1).getTime(),
    max: new Date(2030, 11, 31).getTime(),
  })
  .map((ms) => {
    const d = new Date(ms);
    d.setSeconds(0, 0); // Align to minute boundary
    return d;
  });

/** Generate an ordered pair of dates (start <= end) within a 30-day window */
const datePairArb = dateArb.chain((start) => {
  const maxEnd = start.getTime() + 30 * 24 * 60 * 60 * 1000; // up to 30 days later
  return fc.integer({ min: start.getTime(), max: maxEnd }).map((endMs) => {
    const end = new Date(endMs);
    end.setSeconds(0, 0);
    return [start, end] as [Date, Date];
  });
});

/** Generate a date that falls on a Saturday */
const saturdayArb = fc.integer({ min: 2020, max: 2030 }).chain((year) =>
  fc.integer({ min: 0, max: 11 }).chain((month) =>
    fc.integer({ min: 1, max: 28 }).map((day) => {
      const d = new Date(year, month, day, 10, 0, 0, 0);
      // Advance to next Saturday
      const dayOfWeek = d.getDay();
      const daysUntilSat = (6 - dayOfWeek + 7) % 7;
      d.setDate(d.getDate() + daysUntilSat);
      return d;
    }),
  ),
);

/** Generate a weekend-only range (Saturday to Sunday of the same weekend) */
const weekendRangeArb = saturdayArb.map((sat) => {
  const start = new Date(sat);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sat);
  end.setDate(end.getDate() + 1); // Sunday
  end.setHours(23, 59, 0, 0);
  return [start, end] as [Date, Date];
});

// ============================================================
// Property 4 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 4: cálculo de horas úteis', () => {
  it('result is always >= 0 for any start <= end', () => {
    fc.assert(
      fc.property(datePairArb, ([start, end]) => {
        const result = calculateBusinessHours(start, end);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it('result never exceeds theoretical maximum (businessDays * 8)', () => {
    fc.assert(
      fc.property(datePairArb, ([start, end]) => {
        const result = calculateBusinessHours(start, end);
        const maxDays = countBusinessDays(start, end);
        const maxHours = maxDays * HOURS_PER_DAY;
        expect(result).toBeLessThanOrEqual(maxHours);
      }),
      { numRuns: 100 },
    );
  });

  it('a single full business day (08:00 to 17:30) yields exactly 8 hours', () => {
    fc.assert(
      fc.property(
        // Generate any Monday-Friday date
        fc.integer({ min: 2020, max: 2030 }).chain((year) =>
          fc.integer({ min: 0, max: 11 }).chain((month) =>
            fc.integer({ min: 1, max: 28 }).map((day) => {
              const d = new Date(year, month, day, 8, 0, 0, 0);
              // Advance to next weekday if weekend
              while (!isBusinessDay(d)) {
                d.setDate(d.getDate() + 1);
              }
              return d;
            }),
          ),
        ),
        (weekday) => {
          const start = new Date(weekday);
          start.setHours(8, 0, 0, 0);
          const end = new Date(weekday);
          end.setHours(17, 30, 0, 0);
          const result = calculateBusinessHours(start, end);
          expect(result).toBe(8);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('weekend-only ranges always yield 0 hours', () => {
    fc.assert(
      fc.property(weekendRangeArb, ([start, end]) => {
        const result = calculateBusinessHours(start, end);
        expect(result).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('matches reference implementation (minute-by-minute counting)', () => {
    fc.assert(
      fc.property(datePairArb, ([start, end]) => {
        const actual = calculateBusinessHours(start, end);
        const expected = referenceBusinessHours(start, end);
        // Allow tiny floating point tolerance
        expect(Math.abs(actual - expected)).toBeLessThan(0.02);
      }),
      { numRuns: 100 },
    );
  });
});


// ============================================================
// Property 5 Tests
// ============================================================

/**
 * Feature: leadhelper-restructure, Property 5: round-trip de horas úteis
 *
 * Validates: Requirements 8.6
 *
 * Para qualquer data start e qualquer número positivo de horas úteis h,
 * calculateBusinessHours(start, addBusinessHours(start, h)) === h.
 */

/** Generate positive business hours in minute-aligned increments (0.5 to 40) */
const positiveHoursArb = fc
  .integer({ min: 1, max: 2400 })
  .map((mins) => Math.round((mins / 60) * 100) / 100);

describe('Feature: leadhelper-restructure, Property 5: round-trip de horas úteis', () => {
  it('calculateBusinessHours(start, addBusinessHours(start, h)) === h for any start and positive h', () => {
    fc.assert(
      fc.property(dateArb, positiveHoursArb, (start, h) => {
        const end = addBusinessHours(start, h);
        const roundTrip = calculateBusinessHours(start, end);
        expect(Math.abs(roundTrip - h)).toBeLessThan(0.02);
      }),
      { numRuns: 100 },
    );
  });
});
