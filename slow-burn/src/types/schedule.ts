import type { ReminderDomain } from './models';

/**
 * One thing the app will ask you to do, at a specific minute of a specific
 * day. The engine produces these; the notification layer and the Today screen
 * both consume them, so neither has to know how the plan was derived.
 */
export interface ScheduledItem {
  /**
   * Stable within a day: `${domain}-${HH}${mm}`. Used to reconcile a freshly
   * computed plan against already-persisted events without creating duplicates.
   */
  key: string;
  domain: ReminderDomain;
  /** Minutes since local midnight. Keeps the engine free of timezone maths. */
  minuteOfDay: number;
  /** Short imperative shown on the card and in the notification title. */
  title: string;
  /** The "what", e.g. "250 ml" or "Grilled chicken, rice, greens". */
  detail: string;
  /** Extras persisted onto the habit_event row. */
  payload: Record<string, unknown>;
}

export interface DayPlan {
  /** "YYYY-MM-DD" in the user's local timezone. */
  day: string;
  items: ScheduledItem[];
}
