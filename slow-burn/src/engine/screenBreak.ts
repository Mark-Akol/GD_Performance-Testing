import type { ReminderSettings, UserGoals } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';
import { itemKey, parseTime, roundTo5 } from './time';

/**
 * Minutes of screen time between break prompts.
 *
 * The clinical guidance people quote is 20-20-20 (every 20 minutes, look 20
 * feet away for 20 seconds). Firing a push notification every 20 minutes is
 * how you train someone to mute your app, so the *notification* cadence is
 * every 50 minutes and the in-app break timer runs the 20-second rule. The
 * guidance is respected without the app becoming the distraction.
 */
const DEFAULT_INTERVAL_MIN = 50;

export function planScreenBreaks(
  goals: UserGoals,
  settings: ReminderSettings,
  presetMinutes: number[],
): ScheduledItem[] {
  if (settings.mode === 'preset') {
    return presetMinutes.map((minute) => build(roundTo5(minute)));
  }

  const interval = numberOr(settings.config.intervalMinutes, DEFAULT_INTERVAL_MIN);
  const workStart = parseTime(goals.workStart);
  let workEnd = parseTime(goals.workEnd);
  if (workEnd <= workStart) workEnd += 1440;

  const items: ScheduledItem[] = [];
  // Cap the loop independently of the interval so a bad config value can
  // never generate hundreds of notifications.
  for (let m = workStart + interval; m < workEnd && items.length < 12; m += interval) {
    items.push(build(roundTo5(m)));
  }
  return items;
}

function build(minuteOfDay: number): ScheduledItem {
  return {
    key: itemKey('screen_break', minuteOfDay),
    domain: 'screen_break',
    minuteOfDay,
    title: 'Look away',
    detail: '20 seconds, 20 feet away. Stand up if you can.',
    payload: { seconds: 20 },
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
