import type { GoalType, ReminderSettings, UserGoals } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';
import { itemKey, parseTime, roundTo5, wakingWindow } from './time';

/**
 * Which weekdays a given training frequency maps onto (0 = Sunday).
 *
 * These are chosen for recovery spacing, not convenience: three days becomes
 * Mon/Wed/Fri rather than Mon/Tue/Wed so there is a rest day between hard
 * sessions.
 */
const DAY_PATTERNS: Record<number, number[]> = {
  0: [],
  1: [3],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Session rotation per goal, cycled across that goal's training days. */
const SESSIONS: Record<GoalType, string[]> = {
  lose_fat: ['Full body strength', 'Intervals + core', 'Full body strength', 'Long easy cardio'],
  build_muscle: ['Push: chest, shoulders, triceps', 'Pull: back, biceps', 'Legs', 'Upper body accessory'],
  maintain: ['Full body strength', 'Cardio + mobility', 'Full body strength'],
  endurance: ['Easy aerobic run', 'Intervals', 'Tempo', 'Long run'],
  general_health: ['Full body strength', 'Brisk cardio', 'Mobility + core'],
};

export function planTraining(
  goals: UserGoals,
  settings: ReminderSettings,
  presetMinutes: number[],
  dayOfWeek: number,
  weekIndex: number,
): ScheduledItem[] {
  const frequency = clamp(goals.trainingDays, 0, 7);
  const days = DAY_PATTERNS[frequency] ?? [];
  if (!days.includes(dayOfWeek)) return [];

  // Which session in the rotation this is: position within the week's days,
  // offset by week so the rotation advances rather than repeating forever.
  const positionInWeek = days.indexOf(dayOfWeek);
  const rotation = SESSIONS[goals.goalType];
  const session = rotation[(positionInWeek + weekIndex) % rotation.length] ?? 'Training';

  if (settings.mode === 'preset') {
    return presetMinutes.map((minute) => build(roundTo5(minute), session));
  }

  return [build(coachedTrainingTime(goals), session)];
}

/**
 * Default training slot: half an hour after work ends, unless that lands too
 * close to bedtime, in which case train in the morning instead. Users can
 * always override with preset mode.
 */
function coachedTrainingTime(goals: UserGoals): number {
  const { start, end } = wakingWindow(goals.wakeTime, goals.sleepTime);

  let workEnd = parseTime(goals.workEnd);
  if (workEnd < start) workEnd += 1440;
  const evening = workEnd + 30;

  // Needs to finish at least 2 hours before sleep to not wreck it.
  if (evening <= end - 120) return roundTo5(evening);
  return roundTo5(start + 60);
}

function build(minuteOfDay: number, session: string): ScheduledItem {
  return {
    key: itemKey('training', minuteOfDay),
    domain: 'training',
    minuteOfDay,
    title: 'Train',
    detail: session,
    payload: { session },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
