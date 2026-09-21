import type { ReminderSettings, UserGoals } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';
import { type MealSlot, suggestFood } from '@/data/foods';
import { itemKey, roundTo5, wakingWindow } from './time';

/**
 * How many eating occasions a goal implies. Fat loss gets fewer, larger,
 * more satiating meals; muscle gain and endurance get more frequent feeding.
 */
const SLOTS_BY_GOAL: Record<UserGoals['goalType'], MealSlot[]> = {
  lose_fat: ['breakfast', 'lunch', 'dinner'],
  maintain: ['breakfast', 'lunch', 'snack', 'dinner'],
  general_health: ['breakfast', 'lunch', 'snack', 'dinner'],
  build_muscle: ['breakfast', 'snack', 'lunch', 'snack', 'dinner'],
  endurance: ['breakfast', 'snack', 'lunch', 'snack', 'dinner'],
};

/**
 * Anchor each meal to the waking day as a fraction of it, rather than to
 * fixed clock times. A 05:00 riser and a 10:00 riser both get breakfast
 * shortly after waking and dinner comfortably before bed.
 */
const ANCHORS: Record<MealSlot, number[]> = {
  breakfast: [0.05],
  lunch: [0.4],
  dinner: [0.78],
  snack: [0.24, 0.6],
};

export function planNutrition(
  goals: UserGoals,
  settings: ReminderSettings,
  presetMinutes: number[],
  day: string,
  rotation: number,
): ScheduledItem[] {
  const slots = SLOTS_BY_GOAL[goals.goalType];

  if (settings.mode === 'preset') {
    // Map the user's chosen times onto meal slots in order, so a suggestion
    // still fits the time of day even though the timing is theirs.
    return presetMinutes.map((minute, i) =>
      build(roundTo5(minute), slots[i % slots.length] ?? 'snack', goals, rotation + i, day),
    );
  }

  const { start, end } = wakingWindow(goals.wakeTime, goals.sleepTime);
  const span = end - start;
  // Nothing solid inside the last 2 hours before bed.
  const latest = end - 120;

  const snackAnchors = ANCHORS.snack;
  let snackSeen = 0;

  const items: ScheduledItem[] = [];
  slots.forEach((slot, i) => {
    let fraction: number;
    if (slot === 'snack') {
      fraction = snackAnchors[snackSeen % snackAnchors.length] ?? 0.5;
      snackSeen += 1;
    } else {
      fraction = ANCHORS[slot][0] ?? 0.5;
    }
    const minute = Math.min(latest, roundTo5(start + span * fraction));
    items.push(build(minute, slot, goals, rotation + i, day));
  });

  return items.sort((a, b) => a.minuteOfDay - b.minuteOfDay);
}

function build(
  minuteOfDay: number,
  slot: MealSlot,
  goals: UserGoals,
  rotation: number,
  day: string,
): ScheduledItem {
  const food = suggestFood({
    slot,
    goal: goals.goalType,
    pattern: goals.dietaryPattern,
    allergies: goals.allergies,
    rotation,
  });

  return {
    key: itemKey(`nutrition_${slot}`, minuteOfDay),
    domain: 'nutrition',
    minuteOfDay,
    title: slot === 'snack' ? 'Snack' : capitalise(slot),
    detail: food?.name ?? 'Something balanced — protein, veg, a whole grain',
    payload: {
      slot,
      day,
      foodId: food?.id ?? null,
      kcal: food?.kcal ?? null,
      proteinG: food?.proteinG ?? null,
    },
  };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
