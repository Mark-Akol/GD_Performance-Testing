/**
 * Minute-of-day helpers. The scheduling engine works entirely in "minutes
 * since local midnight" so that it stays pure, synchronous and trivially
 * testable — no Date, no timezone database, no DST edge cases inside the
 * rules themselves. Conversion to real timestamps happens once, at the
 * boundary, in notifications.ts.
 */

/** Parse "HH:mm" into minutes since midnight. Throws on malformed input. */
export function parseTime(hhmm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) throw new Error(`Invalid time "${hhmm}", expected HH:mm`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Format minutes since midnight back into "HH:mm". */
export function formatTime(minuteOfDay: number): string {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Human-facing 12-hour label, e.g. "7:30 am". */
export function formatTimeLabel(minuteOfDay: number): string {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const suffix = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m % 60).padStart(2, '0')} ${suffix}`;
}

/**
 * The user's waking window, normalised so that a sleep time past midnight
 * (e.g. wake 06:30, sleep 00:30) still yields a positive-length window.
 */
export function wakingWindow(wakeTime: string, sleepTime: string): { start: number; end: number } {
  const start = parseTime(wakeTime);
  let end = parseTime(sleepTime);
  if (end <= start) end += 1440;
  return { start, end };
}

/**
 * Evenly space `count` points across [start, end], inset from both edges by
 * half a gap. Even spacing beats "on the hour" here: it prevents every domain
 * from stacking its reminders on the same round numbers.
 */
export function spread(start: number, end: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.round((start + end) / 2)];
  const gap = (end - start) / count;
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(Math.round(start + gap * i + gap / 2));
  }
  return out;
}

/** Round to the nearest 5 minutes — scheduled times should look deliberate. */
export function roundTo5(minuteOfDay: number): number {
  return Math.round(minuteOfDay / 5) * 5;
}

/** Build the stable per-day key the reconciler relies on. */
export function itemKey(domain: string, minuteOfDay: number): string {
  return `${domain}-${formatTime(minuteOfDay).replace(':', '')}`;
}
