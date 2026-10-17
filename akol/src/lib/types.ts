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

export type JewelKey = 'sika' | 'kente' | 'maasai' | 'adire' | 'terracotta' | 'malachite';

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
  /**
   * 'alarm' rings louder (alarm sound on Android, time-sensitive on iOS so it breaks through
   * Focus) and rings again every few minutes until it is ticked off. Defaults to 'notify'.
   */
  alert?: 'notify' | 'alarm';
  /** A one-off task happens only on this date, whatever days its routine runs. */
  date?: DayKey;
  /** How long it takes, in minutes, when Akol planned it. */
  duration?: number;
  /** A non-negotiable time (clocking in, a shift, a set) that the rest of the day is planned around. */
  fixed?: boolean;
  /** Time for yourself ("Me time"): nothing to tick, never late. */
  free?: boolean;
}

/** completions[day][taskId] = epoch ms when it was checked off. */
export type Completions = Record<DayKey, Record<string, number>>;

/** A recorded voice prompt, played as an alarm's sound. */
export interface VoiceClip {
  /** iOS: the file's name in Library/Sounds, which is how a notification names its sound. */
  sound: string;
  /** The file itself, for playing it back in the app. */
  uri: string;
  /** Android: the notification channel that plays this recording, if one could be made. */
  channelId?: string;
  recordedAt: number;
}

export interface Settings {
  /** The member who uses this device ("me"). */
  meId: string | null;
  notificationsEnabled: boolean;
  /** Members this device receives reminders for. Empty = everyone. */
  notifyFor: string[];
  /** Skip a reminder if the task is already checked off. */
  smartSkip: boolean;
  onboarded: boolean;
  /** Alarm-style tasks ring again every few minutes until ticked off. Defaults to true. */
  alarmRepeats?: boolean;
  /** Repeat rings play a voice ("Hey Ra, it's time to go") instead of the alarm sound. Defaults to true. */
  voiceAlarms?: boolean;
  /**
   * Voices recorded on this phone, keyed by member id (or FAMILY_ID for whole-family items).
   * Recordings are files on this phone, so they are not synced or backed up.
   */
  voices?: Record<string, VoiceClip>;
  /** This phone's link to a family sync group, if it has joined one. */
  sync?: { householdId: string; code: string } | null;
  /**
   * Demo clock for showing the app off: the day runs as if it were `time` when the
   * clock was set at `setAt`. Reminders always use the real time.
   */
  demoClock?: { time: ClockTime; setAt: number } | null;
}

export interface AkolState {
  version: 1;
  members: Member[];
  routines: Routine[];
  tasks: Task[];
  completions: Completions;
  settings: Settings;
  /** When the family, routines or tasks last changed (epoch ms); the newest plan wins in sync. */
  planUpdatedAt?: number;
}
