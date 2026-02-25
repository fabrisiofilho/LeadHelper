/**
 * Adds a given number of business days (Mon–Fri) to a start date.
 * Returns the resulting end date.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}

/**
 * Counts the number of business days (Mon–Fri) between two dates (exclusive of start, inclusive of end).
 * Returns 0 if end <= start.
 */
export function countBusinessDays(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      count++;
    }
  }
  return count;
}
