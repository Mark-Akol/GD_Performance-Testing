// Pure scheduling logic. No React / React Native imports so it can be unit-tested with plain Node.
import type { AkolState, ClockTime, Completions, DayKey, Task, Weekday } from './types.ts';

export const FAMILY_ID = 'family';

/** Minutes after a task's time during which it counts as "due now" rather than overdue. */
export const DUE_WINDOW_MIN = 10;
/** Minutes before a task's time during which it counts as "coming up". */
export const SOON_WINDOW_MIN = 15;

export type TaskStatus = 'done' | 'overdue' | 'due' | 'soon' | 'upcoming';

export function parseTime(t: ClockTime): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toClockTime(minutes: number): ClockTime {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime(t: ClockTime, opts: { h24?: boolean } = {}): string {
  const mins = parseTime(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (opts.h24) return toClockTime(mins);
  // Set the way a 1920s timetable would: "6:45 a.m.", "12:00 noon".
  if (h === 12 && m === 0) return '12:00 noon';
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function dayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function atTime(day: Date, t: ClockTime): Date {
  const mins = parseTime(t);
  const d = new Date(day);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function sortByTime(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      parseTime(a.time) - parseTime(b.time) ||
      Number(!!a.checkpoint) - Number(!!b.checkpoint) ||
      a.title.localeCompare(b.title),
  );
}

/** All tasks that run on `date`, optionally for one member (FAMILY tasks are included for everyone). */
export function tasksForDay(
  state: Pick<AkolState, 'routines' | 'tasks'>,
  date: Date,
  memberId?: string,
): Task[] {
  const weekday = date.getDay() as Weekday;
  const active = new Set(
    state.routines.filter((r) => r.enabled && r.days.includes(weekday)).map((r) => r.id),
  );
  return sortByTime(
    state.tasks.filter(
      (t) =>
        active.has(t.routineId) &&
        (memberId === undefined || t.memberId === memberId || t.memberId === FAMILY_ID),
    ),
  );
}

export function isDone(completions: Completions, day: DayKey, taskId: string): boolean {
  return !!completions[day]?.[taskId];
}

export function taskStatus(task: Task, done: boolean, now: Date): TaskStatus {
  if (done) return 'done';
  const delta = minutesOfDay(now) - parseTime(task.time);
  if (delta >= DUE_WINDOW_MIN) return 'overdue';
  if (delta >= 0) return 'due';
  if (delta >= -SOON_WINDOW_MIN) return 'soon';
  return 'upcoming';
}

export interface Progress {
  done: number;
  total: number;
  ratio: number;
}

/** Checkpoints are summaries, not chores, so they don't count toward progress. */
export function progress(tasks: Task[], completions: Completions, day: DayKey): Progress {
  const countable = tasks.filter((t) => !t.checkpoint);
  const done = countable.filter((t) => isDone(completions, day, t.id)).length;
  const total = countable.length;
  return { done, total, ratio: total ? done / total : 0 };
}

export interface CheckpointSummary {
  done: Task[];
  outstanding: Task[];
  complete: boolean;
}

/** Everything in the checkpoint's routine that is due at or before it. */
export function checkpointSummary(
  checkpoint: Task,
  state: Pick<AkolState, 'tasks'>,
  completions: Completions,
  day: DayKey,
): CheckpointSummary {
  const limit = parseTime(checkpoint.time);
  const relevant = sortByTime(
    state.tasks.filter(
      (t) => t.routineId === checkpoint.routineId && !t.checkpoint && parseTime(t.time) <= limit,
    ),
  );
  const done = relevant.filter((t) => isDone(completions, day, t.id));
  const outstanding = relevant.filter((t) => !isDone(completions, day, t.id));
  return { done, outstanding, complete: outstanding.length === 0 };
}

/** The next unfinished task at or after "now" (or the most urgent overdue one if nothing is ahead). */
export function nextUp(
  tasks: Task[],
  completions: Completions,
  day: DayKey,
  now: Date,
): { task: Task; status: TaskStatus } | null {
  const open = tasks.filter((t) => !isDone(completions, day, t.id));
  const withStatus = open.map((task) => ({ task, status: taskStatus(task, false, now) }));
  return (
    withStatus.find((x) => x.status === 'due') ??
    withStatus.find((x) => x.status === 'soon' || x.status === 'upcoming') ??
    null
  );
}

export function overdue(tasks: Task[], completions: Completions, day: DayKey, now: Date): Task[] {
  return tasks.filter(
    (t) => !t.checkpoint && taskStatus(t, isDone(completions, day, t.id), now) === 'overdue',
  );
}

/**
 * Consecutive days (ending today if today is complete, otherwise yesterday) on which
 * every scheduled task for the member was checked off. Days with nothing scheduled are skipped.
 */
export function streak(
  state: Pick<AkolState, 'routines' | 'tasks' | 'completions'>,
  memberId: string,
  today: Date,
  maxDays = 90,
): number {
  let count = 0;
  for (let i = 0; i < maxDays; i++) {
    const date = addDays(today, -i);
    const tasks = tasksForDay(state, date, memberId).filter(
      (t) => !t.checkpoint && t.memberId === memberId,
    );
    if (tasks.length === 0) continue;
    const p = progress(tasks, state.completions, dayKey(date));
    if (p.done === p.total) count++;
    else if (i === 0) continue; // today still in progress: don't break the streak yet
    else break;
  }
  return count;
}

export interface PlannedReminder {
  task: Task;
  at: Date;
  day: DayKey;
}

/**
 * The reminders that should be pending right now, soonest first.
 * We use a rolling window of one-off reminders (rather than repeating triggers) so that
 * items already checked off can be skipped and we stay under iOS's 64 pending-notification cap.
 */
export function planReminders(
  state: AkolState,
  now: Date,
  opts: { horizonDays?: number; limit?: number } = {},
): PlannedReminder[] {
  const { horizonDays = 4, limit = 60 } = opts;
  const { notifyFor, smartSkip } = state.settings;
  const wanted = (memberId: string) =>
    notifyFor.length === 0 || memberId === FAMILY_ID || notifyFor.includes(memberId);

  const out: PlannedReminder[] = [];
  for (let i = 0; i < horizonDays && out.length < limit; i++) {
    const date = addDays(now, i);
    const day = dayKey(date);
    for (const task of tasksForDay(state, date)) {
      if (task.remind === false || !wanted(task.memberId)) continue;
      const at = atTime(date, task.time);
      if (at.getTime() <= now.getTime()) continue;
      if (smartSkip && isDone(state.completions, day, task.id)) continue;
      out.push({ task, at, day });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Drop completion history older than `keepDays` so storage stays small. */
export function pruneCompletions(completions: Completions, today: Date, keepDays = 120): Completions {
  const cutoff = dayKey(addDays(today, -keepDays));
  const out: Completions = {};
  for (const [k, v] of Object.entries(completions)) if (k >= cutoff) out[k] = v;
  return out;
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function describeDays(days: Weekday[]): string {
  const s = [...days].sort().join(',');
  if (s === '0,1,2,3,4,5,6') return 'Every day';
  if (s === '1,2,3,4,5') return 'Weekdays';
  if (s === '0,6') return 'Weekends';
  if (days.length === 0) return 'Paused';
  // Show Monday-first.
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => WEEKDAY_SHORT[d])
    .join(' · ');
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "in 12 min", "in 1 h 5 min", "now", "8 min ago". */
export function relative(target: Date, now: Date): string {
  const diff = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diff === 0) return 'now';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const text = h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  return diff > 0 ? `in ${text}` : `${text} ago`;
}
