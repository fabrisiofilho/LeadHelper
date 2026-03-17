import { describe, it, expect } from 'vitest';
import {
  isBusinessDay,
  isBusinessHour,
  nextBusinessHourStart,
  calculateBusinessHours,
  addBusinessHours,
} from '@main/infrastructure/utils/business-hours';

// Helper: create a Date for a specific day and time
// month is 0-indexed (0 = January)
function date(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

describe('business-hours', () => {
  // ============================================================
  // isBusinessDay
  // ============================================================
  describe('isBusinessDay', () => {
    it('should return true for Monday through Friday', () => {
      // 2025-01-06 = Monday ... 2025-01-10 = Friday
      expect(isBusinessDay(date(2025, 0, 6))).toBe(true); // Mon
      expect(isBusinessDay(date(2025, 0, 7))).toBe(true); // Tue
      expect(isBusinessDay(date(2025, 0, 8))).toBe(true); // Wed
      expect(isBusinessDay(date(2025, 0, 9))).toBe(true); // Thu
      expect(isBusinessDay(date(2025, 0, 10))).toBe(true); // Fri
    });

    it('should return false for Saturday and Sunday', () => {
      // 2025-01-11 = Saturday, 2025-01-12 = Sunday
      expect(isBusinessDay(date(2025, 0, 11))).toBe(false); // Sat
      expect(isBusinessDay(date(2025, 0, 12))).toBe(false); // Sun
    });
  });

  // ============================================================
  // isBusinessHour
  // ============================================================
  describe('isBusinessHour', () => {
    it('should return true at the start of morning (08:00)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 8, 0))).toBe(true);
    });

    it('should return true during morning hours (10:30)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 10, 30))).toBe(true);
    });

    it('should return false at end of morning (12:00) — exclusive', () => {
      expect(isBusinessHour(date(2025, 0, 6, 12, 0))).toBe(false);
    });

    it('should return false during lunch break (12:30)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 12, 30))).toBe(false);
    });

    it('should return false just before afternoon start (13:29)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 13, 29))).toBe(false);
    });

    it('should return true at the start of afternoon (13:30)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 13, 30))).toBe(true);
    });

    it('should return true during afternoon hours (15:00)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 15, 0))).toBe(true);
    });

    it('should return false at end of afternoon (17:30) — exclusive', () => {
      expect(isBusinessHour(date(2025, 0, 6, 17, 30))).toBe(false);
    });

    it('should return false before business hours (07:59)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 7, 59))).toBe(false);
    });

    it('should return false after business hours (18:00)', () => {
      expect(isBusinessHour(date(2025, 0, 6, 18, 0))).toBe(false);
    });

    it('should return false on weekends even during business hours', () => {
      // Saturday at 10:00
      expect(isBusinessHour(date(2025, 0, 11, 10, 0))).toBe(false);
      // Sunday at 14:00
      expect(isBusinessHour(date(2025, 0, 12, 14, 0))).toBe(false);
    });
  });

  // ============================================================
  // nextBusinessHourStart
  // ============================================================
  describe('nextBusinessHourStart', () => {
    it('should return same time (zeroed seconds) when already in morning hours', () => {
      const result = nextBusinessHourStart(date(2025, 0, 6, 9, 15));
      expect(result).toEqual(date(2025, 0, 6, 9, 15));
    });

    it('should return same time (zeroed seconds) when already in afternoon hours', () => {
      const result = nextBusinessHourStart(date(2025, 0, 6, 14, 0));
      expect(result).toEqual(date(2025, 0, 6, 14, 0));
    });

    it('should jump to 08:00 when before morning start', () => {
      const result = nextBusinessHourStart(date(2025, 0, 6, 6, 30));
      expect(result).toEqual(date(2025, 0, 6, 8, 0));
    });

    it('should jump to 13:30 during lunch break', () => {
      const result = nextBusinessHourStart(date(2025, 0, 6, 12, 45));
      expect(result).toEqual(date(2025, 0, 6, 13, 30));
    });

    it('should jump to next day 08:00 after afternoon end', () => {
      const result = nextBusinessHourStart(date(2025, 0, 6, 18, 0));
      // 2025-01-06 is Monday, next day is Tuesday
      expect(result).toEqual(date(2025, 0, 7, 8, 0));
    });

    it('should jump to Monday 08:00 when on Saturday', () => {
      // 2025-01-11 = Saturday
      const result = nextBusinessHourStart(date(2025, 0, 11, 10, 0));
      // Next Monday = 2025-01-13
      expect(result).toEqual(date(2025, 0, 13, 8, 0));
    });

    it('should jump to Monday 08:00 when on Sunday', () => {
      // 2025-01-12 = Sunday
      const result = nextBusinessHourStart(date(2025, 0, 12, 15, 0));
      expect(result).toEqual(date(2025, 0, 13, 8, 0));
    });

    it('should jump to Monday when Friday after 17:30', () => {
      // 2025-01-10 = Friday
      const result = nextBusinessHourStart(date(2025, 0, 10, 19, 0));
      expect(result).toEqual(date(2025, 0, 13, 8, 0));
    });
  });

  // ============================================================
  // calculateBusinessHours
  // ============================================================
  describe('calculateBusinessHours', () => {
    it('should return 0 when start >= end', () => {
      const d = date(2025, 0, 6, 10, 0);
      expect(calculateBusinessHours(d, d)).toBe(0);
      expect(calculateBusinessHours(date(2025, 0, 7, 10, 0), d)).toBe(0);
    });

    it('should count hours within morning period only', () => {
      // Monday 09:00 to 11:00 = 2 business hours
      const start = date(2025, 0, 6, 9, 0);
      const end = date(2025, 0, 6, 11, 0);
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should count hours within afternoon period only', () => {
      // Monday 14:00 to 16:00 = 2 business hours
      const start = date(2025, 0, 6, 14, 0);
      const end = date(2025, 0, 6, 16, 0);
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should skip lunch break when crossing from morning to afternoon', () => {
      // Monday 11:00 to 14:30 = 1h morning (11-12) + 1h afternoon (13:30-14:30) = 2h
      const start = date(2025, 0, 6, 11, 0);
      const end = date(2025, 0, 6, 14, 30);
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should return 8 hours for a full business day', () => {
      // Monday 08:00 to 17:30 = 4h morning + 4h afternoon = 8h
      const start = date(2025, 0, 6, 8, 0);
      const end = date(2025, 0, 6, 17, 30);
      expect(calculateBusinessHours(start, end)).toBe(8);
    });

    it('should skip weekends', () => {
      // Friday 16:30 to Monday 09:00
      // Friday: 16:30-17:30 = 1h
      // Saturday + Sunday = 0h
      // Monday: 08:00-09:00 = 1h
      // Total = 2h
      const start = date(2025, 0, 10, 16, 30); // Friday
      const end = date(2025, 0, 13, 9, 0); // Monday
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should handle start outside business hours', () => {
      // Monday 06:00 to Monday 09:00 = only 08:00-09:00 = 1h
      const start = date(2025, 0, 6, 6, 0);
      const end = date(2025, 0, 6, 9, 0);
      expect(calculateBusinessHours(start, end)).toBe(1);
    });

    it('should handle start during lunch', () => {
      // Monday 12:30 to Monday 15:30 = 13:30-15:30 = 2h
      const start = date(2025, 0, 6, 12, 30);
      const end = date(2025, 0, 6, 15, 30);
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should count multiple full days correctly', () => {
      // Monday 08:00 to Wednesday 17:30 = 3 full days = 24h
      const start = date(2025, 0, 6, 8, 0); // Monday
      const end = date(2025, 0, 8, 17, 30); // Wednesday
      expect(calculateBusinessHours(start, end)).toBe(24);
    });

    it('should return 0 when range is entirely outside business hours', () => {
      // Monday 18:00 to Monday 23:00 = 0h
      const start = date(2025, 0, 6, 18, 0);
      const end = date(2025, 0, 6, 23, 0);
      expect(calculateBusinessHours(start, end)).toBe(0);
    });

    it('should return 0 when range is entirely on weekend', () => {
      // Saturday 10:00 to Sunday 16:00 = 0h
      const start = date(2025, 0, 11, 10, 0);
      const end = date(2025, 0, 12, 16, 0);
      expect(calculateBusinessHours(start, end)).toBe(0);
    });
  });

  // ============================================================
  // addBusinessHours
  // ============================================================
  describe('addBusinessHours', () => {
    it('should add hours within the same morning period', () => {
      // Monday 09:00 + 2h = Monday 11:00
      const result = addBusinessHours(date(2025, 0, 6, 9, 0), 2);
      expect(result).toEqual(date(2025, 0, 6, 11, 0));
    });

    it('should add hours within the same afternoon period', () => {
      // Monday 14:00 + 2h = Monday 16:00
      const result = addBusinessHours(date(2025, 0, 6, 14, 0), 2);
      expect(result).toEqual(date(2025, 0, 6, 16, 0));
    });

    it('should cross lunch break correctly', () => {
      // Monday 11:00 + 2h = 1h morning (11-12) + 1h afternoon (13:30-14:30) = Monday 14:30
      const result = addBusinessHours(date(2025, 0, 6, 11, 0), 2);
      expect(result).toEqual(date(2025, 0, 6, 14, 30));
    });

    it('should cross to next day when exceeding afternoon', () => {
      // Monday 16:30 + 2h = 1h Monday (16:30-17:30) + 1h Tuesday (08:00-09:00) = Tuesday 09:00
      const result = addBusinessHours(date(2025, 0, 6, 16, 30), 2);
      expect(result).toEqual(date(2025, 0, 7, 9, 0));
    });

    it('should skip weekends', () => {
      // Friday 16:30 + 2h = 1h Friday (16:30-17:30) + 1h Monday (08:00-09:00) = Monday 09:00
      const result = addBusinessHours(date(2025, 0, 10, 16, 30), 2);
      expect(result).toEqual(date(2025, 0, 13, 9, 0));
    });

    it('should handle start outside business hours', () => {
      // Monday 06:00 + 1h → starts at 08:00 → Monday 09:00
      const result = addBusinessHours(date(2025, 0, 6, 6, 0), 1);
      expect(result).toEqual(date(2025, 0, 6, 9, 0));
    });

    it('should handle start during lunch', () => {
      // Monday 12:30 + 1h → starts at 13:30 → Monday 14:30
      const result = addBusinessHours(date(2025, 0, 6, 12, 30), 1);
      expect(result).toEqual(date(2025, 0, 6, 14, 30));
    });

    it('should add exactly 8h to produce a full business day', () => {
      // Monday 08:00 + 8h = Monday 17:30
      const result = addBusinessHours(date(2025, 0, 6, 8, 0), 8);
      expect(result).toEqual(date(2025, 0, 6, 17, 30));
    });

    it('should return same date when adding 0 hours', () => {
      const d = date(2025, 0, 6, 10, 0);
      const result = addBusinessHours(d, 0);
      expect(result).toEqual(d);
    });

    it('should handle adding hours from weekend start', () => {
      // Saturday 10:00 + 1h → starts Monday 08:00 → Monday 09:00
      const result = addBusinessHours(date(2025, 0, 11, 10, 0), 1);
      expect(result).toEqual(date(2025, 0, 13, 9, 0));
    });

    it('should handle multi-day addition crossing weekend', () => {
      // Friday 08:00 + 16h = 8h Friday + 8h Monday = Monday 17:30
      const result = addBusinessHours(date(2025, 0, 10, 8, 0), 16);
      expect(result).toEqual(date(2025, 0, 13, 17, 30));
    });
  });
});
