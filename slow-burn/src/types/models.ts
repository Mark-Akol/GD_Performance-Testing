/**
 * Shared domain types. These mirror the Postgres schema in
 * supabase/migrations/0001_init.sql one-for-one — if you change a column,
 * change it here in the same commit.
 */

export type ReminderDomain =
  | 'hydration'
  | 'nutrition'
  | 'movement'
  | 'screen_break'
  | 'training';

export const REMINDER_DOMAINS: ReminderDomain[] = [
  'hydration',
  'nutrition',
  'movement',
  'screen_break',
  'training',
];

/**
 * The two-choice model the product is built around: either the user sets the
 * times themselves, or the app derives them from their profile and goal.
 */
export type ReminderMode = 'preset' | 'coached';

export type GoalType =
  | 'lose_fat'
  | 'build_muscle'
  | 'maintain'
  | 'endurance'
  | 'general_health';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';

export type DietaryPattern = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal' | 'kosher';

export type Sex = 'male' | 'female' | 'unspecified';

export interface Profile {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
}

export interface UserGoals {
  userId: string;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  sex: Sex;
  heightCm: number | null;
  weightKg: number | null;
  /** "HH:mm" local time. */
  wakeTime: string;
  sleepTime: string;
  workStart: string;
  workEnd: string;
  trainingDays: number;
  dietaryPattern: DietaryPattern;
  allergies: string[];
}

export interface ReminderSettings {
  userId: string;
  domain: ReminderDomain;
  mode: ReminderMode;
  enabled: boolean;
  /** Only meaningful when mode === 'preset'. "HH:mm" strings. */
  presetTimes: string[];
  /** Domain-specific knobs, e.g. { cupMl: 250 } for hydration. */
  config: Record<string, unknown>;
}

export type EventStatus = 'pending' | 'done' | 'skipped' | 'missed';

export interface HabitEvent {
  id: string;
  userId: string;
  domain: ReminderDomain;
  /** ISO timestamp the item was scheduled for. */
  scheduledFor: string;
  status: EventStatus;
  completedAt: string | null;
  /** Free-form extras: { ml: 250 } or { suggestion: 'Greek yoghurt + berries' }. */
  payload: Record<string, unknown>;
}

export interface DailySummary {
  userId: string;
  day: string;
  completed: number;
  total: number;
  /** 0-100. What the circle sees. */
  score: number;
  streak: number;
}

export interface Circle {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
}

export interface CircleMember {
  circleId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

/** A member row joined with today's summary — what the Circle tab renders. */
export interface CircleStanding {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  completed: number;
  total: number;
  streak: number;
}

export type NudgeKind = 'cheer' | 'poke' | 'callout';

export interface Nudge {
  id: string;
  circleId: string;
  fromUserId: string;
  toUserId: string;
  kind: NudgeKind;
  message: string | null;
  createdAt: string;
}
