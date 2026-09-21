import type { ReminderSettings, UserGoals } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';
import { itemKey, parseTime, roundTo5, spread } from './time';

const DEFAULT_WALK_MINUTES = 10;

/**
 * Walk prompts sit inside the working day, because that is where the
 * sedentary block actually is. Someone who is already out of the office
 * doesn't need the app to tell them to move.
 */
export function planMovement(
  goals: UserGoals,
  settings: ReminderSettings,
  presetMinutes: number[],
): ScheduledItem[] {
  const walkMinutes = numberOr(settings.config.walkMinutes, DEFAULT_WALK_MINUTES);

  if (settings.mode === 'preset') {
    return presetMinutes.map((minute) => build(roundTo5(minute), walkMinutes));
  }

  const workStart = parseTime(goals.workStart);
  let workEnd = parseTime(goals.workEnd);
  if (workEnd <= workStart) workEnd += 1440;

  const hours = (workEnd - workStart) / 60;
  // Roughly one walk every two and a half hours, floor of 2, ceiling of 4.
  const walks = Math.min(4, Math.max(2, Math.round(hours / 2.5)));

  return spread(workStart, workEnd, walks).map((minute) => build(roundTo5(minute), walkMinutes));
}

function build(minuteOfDay: number, walkMinutes: number): ScheduledItem {
  return {
    key: itemKey('movement', minuteOfDay),
    domain: 'movement',
    minuteOfDay,
    title: 'Walk',
    detail: `${walkMinutes} minutes, outside if you can`,
    payload: { walkMinutes },
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
