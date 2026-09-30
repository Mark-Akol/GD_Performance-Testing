/** Weekday index matching JavaScript's Date#getDay(): 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** "HH:MM" in 24-hour local time, e.g. "06:45". */
export type ClockTime = string;

/** "YYYY-MM-DD" in local time. */
export type DayKey = string;

export type MemberRole = 'parent' | 'child' | 'other';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  /** Key into theme.jewels. */
  color: JewelKey;
  /** A single emoji or short monogram shown in the avatar. */
  emoji?: string;
}

export type JewelKey = 'emerald' | 'sapphire' | 'ruby' | 'amethyst' | 'topaz' | 'pearl';

export interface Routine {
  id: string;
  name: string;
  /** Days this routine runs. */
  days: Weekday[];
  enabled: boolean;
}

export interface Task {
  id: string;
  routineId: string;
  /** A member id, or FAMILY_ID ('family') for household-wide items such as "Go time". */
  memberId: string;
  title: string;
  time: ClockTime;
  note?: string;
  /**
   * A checkpoint is a "Have you completed the checklist?" moment (e.g. 7:30 Go time).
   * It summarises everything in its routine due at or before it.
   */
  checkpoint?: boolean;
  /** Send a push reminder at `time`. Defaults to true. */
  remind?: boolean;
}

/** completions[day][taskId] = epoch ms when it was checked off. */
export type Completions = Record<DayKey, Record<string, number>>;

export interface Settings {
  /** The member who uses this device ("me"). */
  meId: string | null;
  notificationsEnabled: boolean;
  /** Members this device receives reminders for. Empty = everyone. */
  notifyFor: string[];
  /** Skip a reminder if the task is already checked off. */
  smartSkip: boolean;
  onboarded: boolean;
}

export interface AkolState {
  version: 1;
  members: Member[];
  routines: Routine[];
  tasks: Task[];
  completions: Completions;
  settings: Settings;
}
