/**
 * The user's local calendar day as "YYYY-MM-DD".
 *
 * Deliberately built from the device's local fields rather than
 * `toISOString()`, which converts to UTC first and so files a 23:50
 * completion in Johannesburg under the following day.
 */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local weekday, 0 = Sunday — the form the training planner expects. */
export function localDayOfWeek(date: Date = new Date()): number {
  return date.getDay();
}

/** Absolute timestamp for a minute-of-day on a given local date. */
export function timestampFor(minuteOfDay: number, date: Date = new Date()): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minuteOfDay);
  return out;
}

/** Minutes since local midnight, right now. */
export function currentMinuteOfDay(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}
