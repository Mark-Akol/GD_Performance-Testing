import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { addDays, dayKey } from './schedule';
import { useAkol } from './store';
import {
  fetchFamily,
  getSyncStatus,
  onSyncStatus,
  pushPlan,
  pushTicks,
  setSyncStatus,
  subscribeFamily,
  syncConfigured,
  type SyncStatus,
} from './sync';
import { diffCompletions, planOf, type Tick } from './syncLogic';
import type { AkolState, Completions } from './types';

const keyOf = (t: { day: string; taskId: string }) => `${t.day}|${t.taskId}`;

/**
 * Keeps this phone and the rest of the family in step. Mounted once inside the store.
 * Local changes are pushed as they happen; other phones' changes arrive live and on resume.
 */
export function FamilySync() {
  const { state, dispatch, ready } = useAkol();
  const householdId = state.settings.sync?.householdId ?? null;

  const latest = useRef<AkolState>(state);
  latest.current = state;
  const lastCompletions = useRef<Completions>(state.completions);
  const knownPlanAt = useRef<number>(state.planUpdatedAt ?? 0);
  /** What the server last told us about each tick, so we never echo it back. */
  const seen = useRef(new Map<string, boolean>());
  const live = useRef(false);

  const fail = (e: unknown) => setSyncStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });

  // Connect, catch up, and listen.
  useEffect(() => {
    if (!ready || !householdId || !syncConfigured) {
      live.current = false;
      setSyncStatus({ kind: 'off' });
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;

    const catchUp = async () => {
      setSyncStatus({ kind: 'connecting' });
      try {
        const since = dayKey(addDays(new Date(), -14));
        const { plan, ticks } = await fetchFamily(householdId, since);
        if (cancelled) return;
        for (const t of ticks) seen.current.set(keyOf(t), t.done);

        // Send anything this phone did while it was offline.
        const local = latest.current;
        const offline: Tick[] = [];
        for (const [day, done] of Object.entries(local.completions)) {
          if (day < since) continue;
          for (const [taskId, at] of Object.entries(done)) {
            if (seen.current.get(keyOf({ day, taskId })) !== true) offline.push({ day, taskId, done: true, at });
          }
        }
        const localPlanNewer = !plan || (local.planUpdatedAt ?? 0) > plan.updatedAt;
        await Promise.all([
          offline.length ? pushTicks(householdId, offline) : null,
          localPlanNewer ? pushPlan(householdId, planOf(local)) : null,
        ]);
        for (const t of offline) seen.current.set(keyOf(t), true);

        if (plan && !localPlanNewer) knownPlanAt.current = plan.updatedAt;
        if (localPlanNewer) knownPlanAt.current = local.planUpdatedAt ?? 0;
        dispatch({ type: 'applyRemote', plan: localPlanNewer ? undefined : (plan ?? undefined), ticks });
        live.current = true;
        setSyncStatus({ kind: 'live', lastSync: Date.now() });
      } catch (e) {
        fail(e);
      }
    };

    catchUp().then(() => {
      if (cancelled) return;
      stop = subscribeFamily(
        householdId,
        (plan) => {
          if (plan.updatedAt <= knownPlanAt.current) return;
          knownPlanAt.current = plan.updatedAt;
          dispatch({ type: 'applyRemote', plan });
          setSyncStatus({ kind: 'live', lastSync: Date.now() });
        },
        (tick) => {
          seen.current.set(keyOf(tick), tick.done);
          dispatch({ type: 'applyRemote', ticks: [tick] });
          setSyncStatus({ kind: 'live', lastSync: Date.now() });
        },
      );
    });

    // Phones drop sockets in the background; catch up whenever the app comes back.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && catchUp());
    return () => {
      cancelled = true;
      live.current = false;
      stop?.();
      sub.remove();
    };
  }, [ready, householdId, dispatch]);

  // Push this phone's own changes (anything the server hasn't already told us).
  useEffect(() => {
    const prev = lastCompletions.current;
    lastCompletions.current = state.completions;
    if (!householdId || !syncConfigured || !live.current) return;

    const ticks = diffCompletions(prev, state.completions).filter((t) => seen.current.get(keyOf(t)) !== t.done);
    for (const t of ticks) seen.current.set(keyOf(t), t.done);
    const planChanged = (state.planUpdatedAt ?? 0) > knownPlanAt.current;
    if (planChanged) knownPlanAt.current = state.planUpdatedAt ?? 0;
    if (!ticks.length && !planChanged) return;

    Promise.all([
      ticks.length ? pushTicks(householdId, ticks) : null,
      planChanged ? pushPlan(householdId, planOf(state)) : null,
    ])
      .then(() => setSyncStatus({ kind: 'live', lastSync: Date.now() }))
      .catch(fail);
  }, [state, householdId]);

  return null;
}

export function useSyncStatus(): SyncStatus {
  const [s, set] = useState(getSyncStatus());
  useEffect(() => onSyncStatus(set), []);
  return s;
}
