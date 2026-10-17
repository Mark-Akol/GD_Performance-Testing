// Pure helpers for family sync and backups. No React Native or network imports, so they
// can be unit-tested with plain Node.
import type { AkolState, Completions, DayKey, Member, Routine, Task } from './types.ts';

/** One tick or untick of one task on one day: the unit that syncs between phones. */
export interface Tick {
  day: DayKey;
  taskId: string;
  done: boolean;
  /** Epoch ms of the change; the later change wins. */
  at: number;
}

/** The shared plan: everything except ticks and per-device settings. */
export interface PlanDoc {
  members: Member[];
  routines: Routine[];
  tasks: Task[];
  updatedAt: number;
}

export function planOf(state: Pick<AkolState, 'members' | 'routines' | 'tasks'> & { planUpdatedAt?: number }): PlanDoc {
  return { members: state.members, routines: state.routines, tasks: state.tasks, updatedAt: state.planUpdatedAt ?? 0 };
}

/** Ticks and unticks that turn `prev` into `next`. */
export function diffCompletions(prev: Completions, next: Completions, now = Date.now()): Tick[] {
  const out: Tick[] = [];
  const days = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const day of days) {
    const a = prev[day] ?? {};
    const b = next[day] ?? {};
    for (const taskId of Object.keys(b)) if (!a[taskId]) out.push({ day, taskId, done: true, at: b[taskId] });
    for (const taskId of Object.keys(a)) if (!b[taskId]) out.push({ day, taskId, done: false, at: now });
  }
  return out;
}

/**
 * Apply ticks from another phone. A tick sets the task done unless this phone already has it
 * done; an untick clears it unless this phone ticked it after the untick happened.
 */
export function applyTicks(completions: Completions, ticks: Tick[]): Completions {
  const out: Completions = { ...completions };
  for (const t of ticks) {
    const day = { ...(out[t.day] ?? {}) };
    const local = day[t.taskId];
    if (t.done) {
      if (!local) day[t.taskId] = t.at;
    } else if (local && local <= t.at) {
      delete day[t.taskId];
    }
    out[t.day] = day;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Backups: a block of text the user can save anywhere (Notes, email, Files) and paste back in.

const BACKUP_HEADER = 'AKOL BACKUP v1';

export interface BackupData {
  members: Member[];
  routines: Routine[];
  tasks: Task[];
  completions: Completions;
}

export function makeBackup(state: AkolState, now = new Date()): string {
  const data: BackupData = {
    members: state.members,
    routines: state.routines,
    tasks: state.tasks,
    completions: state.completions,
  };
  return `${BACKUP_HEADER} · ${now.toISOString()}\n${JSON.stringify(data)}`;
}

/** Read a pasted backup. Returns the data, or an error message a person can act on. */
export function parseBackup(text: string): { ok: true; data: BackupData } | { ok: false; error: string } {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  if (!trimmed.startsWith(BACKUP_HEADER) || start === -1) {
    return { ok: false, error: 'That doesn’t look like an Akol backup. Paste the whole text, starting “AKOL BACKUP”.' };
  }
  try {
    const raw = JSON.parse(trimmed.slice(start)) as Partial<BackupData>;
    if (!Array.isArray(raw.members) || !Array.isArray(raw.routines) || !Array.isArray(raw.tasks)) {
      return { ok: false, error: 'This backup is missing its family, routines or tasks.' };
    }
    return {
      ok: true,
      data: {
        members: raw.members,
        routines: raw.routines,
        tasks: raw.tasks,
        completions: raw.completions && typeof raw.completions === 'object' ? raw.completions : {},
      },
    };
  } catch {
    return { ok: false, error: 'This backup is incomplete. Make sure you copied all of it.' };
  }
}

/** Family codes: 6 characters without look-alikes (no 0/O, 1/I/L), shown as AKOL-XXXXXX. */
export function normaliseFamilyCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/^AKOL-?/, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}
