import type { ReminderSettings, UserGoals } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';
import { itemKey, roundTo5, spread, wakingWindow } from './time';

const DEFAULT_CUP_ML = 250;
const DEFAULT_WEIGHT_KG = 70;

/** Multipliers on baseline intake, by how much the user actually moves. */
const ACTIVITY_MULTIPLIER: Record<UserGoals['activityLevel'], number> = {
  sedentary: 1,
  light: 1.08,
  moderate: 1.15,
  high: 1.25,
  athlete: 1.35,
};

/**
 * Daily water target in millilitres.
 *
 * Baseline is the widely used 33 ml per kg of bodyweight, scaled by activity
 * level. This is a nudge target, not a clinical prescription — it is clamped
 * to a sane 1.5-4.5 L band so that an outlier weight entry (or a typo) can
 * never tell someone to drink a dangerous amount.
 */
export function dailyWaterTargetMl(goals: UserGoals): number {
  const weight = goals.weightKg && goals.weightKg > 0 ? goals.weightKg : DEFAULT_WEIGHT_KG;
  const raw = weight * 33 * ACTIVITY_MULTIPLIER[goals.activityLevel];
  return Math.round(Math.min(4500, Math.max(1500, raw)) / 50) * 50;
}

/**
 * Build the day's water prompts.
 *
 * Coached mode spaces cups evenly across the waking day but stops 90 minutes
 * before bed, because the fastest way to get an accountability app deleted is
 * to wake someone up at 2am. Preset mode uses the user's own times verbatim —
 * that is the whole point of offering the choice.
 */
export function planHydration(
  goals: UserGoals,
  settings: ReminderSettings,
  presetMinutes: number[],
): ScheduledItem[] {
  const cupMl = numberOr(settings.config.cupMl, DEFAULT_CUP_ML);

  if (settings.mode === 'preset') {
    return presetMinutes.map((minute) => build(minute, cupMl));
  }

  const { start, end } = wakingWindow(goals.wakeTime, goals.sleepTime);
  const lastPrompt = end - 90;
  if (lastPrompt <= start) return [];

  const target = dailyWaterTargetMl(goals);
  // Cap at 10 prompts: past that it reads as nagging rather than coaching.
  const cups = Math.min(10, Math.max(4, Math.ceil(target / cupMl)));
  const perCup = Math.round(target / cups / 10) * 10;

  return spread(start, lastPrompt, cups).map((minute) => build(roundTo5(minute), perCup));
}

function build(minuteOfDay: number, ml: number): ScheduledItem {
  return {
    key: itemKey('hydration', minuteOfDay),
    domain: 'hydration',
    minuteOfDay,
    title: 'Water',
    detail: `${ml} ml`,
    payload: { ml },
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
