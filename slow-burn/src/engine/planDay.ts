import type { ReminderDomain, ReminderSettings, UserGoals } from '@/types/models';
import type { DayPlan, ScheduledItem } from '@/types/schedule';
import { dayIndex } from '@/data/foods';
import { planHydration } from './hydration';
import { planMovement } from './movement';
import { planNutrition } from './nutrition';
import { planScreenBreaks } from './screenBreak';
import { planTraining } from './training';
import { parseTime } from './time';

/**
 * Minimum gap between any two prompts, in minutes.
 *
 * Five separate domains all scheduling independently will inevitably collide —
 * a water prompt at 12:30 and a lunch prompt at 12:30 is two buzzes for one
 * moment, and that is precisely what makes people turn notifications off.
 * After merging, colliding items are nudged apart.
 */
const MIN_GAP_MINUTES = 10;

/**
 * Domain priority when two items collide. Meals and training are anchored to
 * real-world commitments, so they hold their slot and the flexible prompts
 * (water, screen breaks) move around them.
 */
const PRIORITY: Record<ReminderDomain, number> = {
  training: 0,
  nutrition: 1,
  movement: 2,
  hydration: 3,
  screen_break: 4,
};

export interface PlanInput {
  goals: UserGoals;
  settings: ReminderSettings[];
  /** "YYYY-MM-DD" in the user's local timezone. */
  day: string;
  /** 0 = Sunday. Pass the local weekday for `day`. */
  dayOfWeek: number;
}

/**
 * Compose one day's plan from every enabled domain.
 *
 * Pure and synchronous: given the same input it always returns the same plan,
 * which is what makes it testable and what lets the Today screen render an
 * optimistic plan before the network has answered.
 */
export function planDay(input: PlanInput): DayPlan {
  const { goals, settings, day, dayOfWeek } = input;
  const rotation = dayIndex(day);
  const weekIndex = Math.floor(rotation / 7);

  const byDomain = new Map<ReminderDomain, ReminderSettings>();
  for (const s of settings) byDomain.set(s.domain, s);

  const items: ScheduledItem[] = [];

  for (const domain of Object.keys(PRIORITY) as ReminderDomain[]) {
    const setting = byDomain.get(domain);
    if (!setting || !setting.enabled) continue;

    const presetMinutes = parsePresets(setting.presetTimes);
    // A preset-mode domain with no times configured has nothing to schedule;
    // falling back to coached here would silently override the user's choice.
    if (setting.mode === 'preset' && presetMinutes.length === 0) continue;

    switch (domain) {
      case 'hydration':
        items.push(...planHydration(goals, setting, presetMinutes));
        break;
      case 'nutrition':
        items.push(...planNutrition(goals, setting, presetMinutes, day, rotation));
        break;
      case 'movement':
        items.push(...planMovement(goals, setting, presetMinutes));
        break;
      case 'screen_break':
        items.push(...planScreenBreaks(goals, setting, presetMinutes));
        break;
      case 'training':
        items.push(...planTraining(goals, setting, presetMinutes, dayOfWeek, weekIndex));
        break;
    }
  }

  return { day, items: deconflict(items) };
}

/**
 * Push colliding prompts apart, lowest-priority first, so the day reads as a
 * sequence rather than a pile. Items keep their own key, which is derived at
 * build time, so moving one never breaks reconciliation against stored events.
 */
function deconflict(items: ScheduledItem[]): ScheduledItem[] {
  const sorted = [...items].sort((a, b) => {
    if (a.minuteOfDay !== b.minuteOfDay) return a.minuteOfDay - b.minuteOfDay;
    return PRIORITY[a.domain] - PRIORITY[b.domain];
  });

  let previous = -Infinity;
  for (const item of sorted) {
    if (item.minuteOfDay - previous < MIN_GAP_MINUTES) {
      item.minuteOfDay = previous + MIN_GAP_MINUTES;
    }
    previous = item.minuteOfDay;
  }

  // Anything shoved past midnight belongs to tomorrow, not tonight.
  return sorted.filter((item) => item.minuteOfDay < 1440);
}

function parsePresets(times: string[]): number[] {
  const out: number[] = [];
  for (const t of times) {
    try {
      out.push(parseTime(t));
    } catch {
      // A malformed stored time should drop that one prompt, not crash the
      // whole day's plan.
    }
  }
  return out.sort((a, b) => a - b);
}
