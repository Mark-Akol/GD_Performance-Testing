import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { syncReminders } from './notifications';
import { JEWEL_KEYS, LEGACY_JEWELS } from '../theme';
import { FAMILY_ID, atTime, dayKey, pruneCompletions } from './schedule';
import { emptyState } from './seed';
import type { AkolState, DayKey, Member, Routine, Settings, Task } from './types';

const STORAGE_KEY = 'akol:state:v1';

type Action =
  | { type: 'replace'; state: AkolState }
  | { type: 'toggle'; taskId: string; day: DayKey; done?: boolean }
  | { type: 'resetDay'; day: DayKey; taskIds?: string[] }
  | { type: 'upsertMember'; member: Member }
  | { type: 'removeMember'; id: string }
  | { type: 'upsertRoutine'; routine: Routine }
  | { type: 'removeRoutine'; id: string }
  | { type: 'upsertTask'; task: Task }
  | { type: 'removeTask'; id: string }
  | { type: 'settings'; patch: Partial<Settings> };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = [...list];
  copy[i] = item;
  return copy;
}

export function reducer(state: AkolState, action: Action): AkolState {
  switch (action.type) {
    case 'replace':
      return action.state;
    case 'toggle': {
      const day = { ...(state.completions[action.day] ?? {}) };
      const next = action.done ?? !day[action.taskId];
      if (next) day[action.taskId] = Date.now();
      else delete day[action.taskId];
      return { ...state, completions: { ...state.completions, [action.day]: day } };
    }
    case 'resetDay': {
      if (!action.taskIds) {
        const { [action.day]: _removed, ...rest } = state.completions;
        return { ...state, completions: rest };
      }
      const day = { ...(state.completions[action.day] ?? {}) };
      for (const id of action.taskIds) delete day[id];
      return { ...state, completions: { ...state.completions, [action.day]: day } };
    }
    case 'upsertMember':
      return { ...state, members: upsert(state.members, action.member) };
    case 'removeMember': {
      const members = state.members.filter((m) => m.id !== action.id);
      const meId = state.settings.meId === action.id ? (members[0]?.id ?? null) : state.settings.meId;
      return {
        ...state,
        members,
        tasks: state.tasks.filter((t) => t.memberId !== action.id),
        settings: {
          ...state.settings,
          meId,
          notifyFor: state.settings.notifyFor.filter((id) => id !== action.id),
        },
      };
    }
    case 'upsertRoutine':
      return { ...state, routines: upsert(state.routines, action.routine) };
    case 'removeRoutine':
      return {
        ...state,
        routines: state.routines.filter((r) => r.id !== action.id),
        tasks: state.tasks.filter((t) => t.routineId !== action.id),
      };
    case 'upsertTask':
      return { ...state, tasks: upsert(state.tasks, action.task) };
    case 'removeTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
  }
}

/** Accept older or partial saved data without crashing. */
function migrate(raw: unknown): AkolState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<AkolState>;
  return {
    version: 1,
    members: Array.isArray(s.members)
      ? s.members.map((m) => ({
          ...m,
          color: JEWEL_KEYS.includes(m.color) ? m.color : (LEGACY_JEWELS[m.color] ?? 'sika'),
        }))
      : [],
    routines: Array.isArray(s.routines) ? s.routines : [],
    tasks: Array.isArray(s.tasks) ? s.tasks : [],
    completions: s.completions && typeof s.completions === 'object' ? s.completions : {},
    settings: { ...base.settings, ...(s.settings ?? {}) },
  };
}

interface Store {
  state: AkolState;
  ready: boolean;
  dispatch: (a: Action) => void;
  me: Member | null;
  member: (id: string) => Member | undefined;
  routine: (id: string) => Routine | undefined;
  toggle: (taskId: string, day?: DayKey) => void;
}

const Ctx = createContext<Store | null>(null);

export function AkolProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);

  // Load once.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) {
          const loaded = migrate(JSON.parse(json));
          loaded.completions = pruneCompletions(loaded.completions, new Date());
          dispatch({ type: 'replace', state: loaded });
        }
      })
      .catch((e) => console.warn('Akol: could not load saved data', e))
      .finally(() => setReady(true));
  }, []);

  // Persist + keep reminders in step with the checklist.
  useEffect(() => {
    if (!ready) return;
    const save = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
        console.warn('Akol: could not save', e),
      );
    }, 250);
    const sync = setTimeout(() => {
      syncReminders(state).catch((e) => console.warn('Akol: reminder sync failed', e));
    }, 900);
    return () => {
      clearTimeout(save);
      clearTimeout(sync);
    };
  }, [state, ready]);

  // Top the rolling reminder window back up whenever the app returns to the foreground.
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && latest.current.settings.onboarded) {
        syncReminders(latest.current).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const toggle = useCallback(
    (taskId: string, day: DayKey = dayKey(new Date())) => dispatch({ type: 'toggle', taskId, day }),
    [],
  );

  const value = useMemo<Store>(() => {
    const byId = new Map(state.members.map((m) => [m.id, m]));
    const routines = new Map(state.routines.map((r) => [r.id, r]));
    return {
      state,
      ready,
      dispatch,
      toggle,
      me: (state.settings.meId && byId.get(state.settings.meId)) || state.members[0] || null,
      member: (id) => byId.get(id),
      routine: (id) => routines.get(id),
    };
  }, [state, ready, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAkol(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAkol must be used inside <AkolProvider>');
  return v;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The app's idea of "now": real time, or the demo clock when one is set. */
export function appNow(settings: Settings, real = new Date()): Date {
  const demo = settings.demoClock;
  if (!demo) return real;
  const elapsed = Math.max(0, real.getTime() - demo.setAt) % DAY_MS;
  return new Date(atTime(real, demo.time).getTime() + elapsed);
}

/** Current time, refreshed every 15 s for countdowns. Honours the demo clock. */
export function useNow(intervalMs = 15000): Date {
  const settings = useContext(Ctx)?.state.settings;
  const [real, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(new Date()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return settings ? appNow(settings, real) : real;
}

export { FAMILY_ID };
