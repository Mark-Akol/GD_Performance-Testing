import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { PlanDoc, Tick } from './syncLogic';

/**
 * Family sync over Supabase. Each phone signs in anonymously (no account, no password) and
 * joins its family's household with a 6-character code. The shared plan is one JSON document;
 * ticks are one row per task per day, so two phones ticking at once never overwrite each other.
 *
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see README) to switch it on.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const syncConfigured = URL.length > 0 && ANON_KEY.length > 0;

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!syncConfigured) throw new Error('Family sync is not set up in this build.');
  if (!client) {
    client = createClient(URL, ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  }
  return client;
}

/** Sign this phone in anonymously, once; the session is remembered across launches. */
export async function ensureSignedIn(): Promise<void> {
  const supa = db();
  const { data } = await supa.auth.getSession();
  if (data.session) return;
  const { error } = await supa.auth.signInAnonymously();
  if (error) throw new Error(`Couldn’t connect: ${error.message}`);
}

export async function startFamily(plan: PlanDoc): Promise<{ householdId: string; code: string }> {
  await ensureSignedIn();
  const { data, error } = await db().rpc('create_household', {
    initial_plan: plan,
    initial_updated_at: plan.updatedAt || Date.now(),
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { household_id: string; code: string } | undefined;
  if (!row) throw new Error('The family could not be created. Try again.');
  return { householdId: row.household_id, code: row.code };
}

/** Returns null when no family has that code. */
export async function joinFamily(code: string): Promise<string | null> {
  await ensureSignedIn();
  const { data, error } = await db().rpc('join_household', { join_code: code });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function leaveFamily(householdId: string): Promise<void> {
  const supa = db();
  const { data } = await supa.auth.getUser();
  if (!data.user) return;
  await supa.from('household_members').delete().eq('household_id', householdId).eq('user_id', data.user.id);
}

/** The family's plan and the last fortnight of ticks. */
export async function fetchFamily(householdId: string, sinceDay: string): Promise<{ plan: PlanDoc | null; ticks: Tick[] }> {
  await ensureSignedIn();
  const supa = db();
  const [plan, ticks] = await Promise.all([
    supa.from('household_plan').select('plan, updated_at').eq('household_id', householdId).maybeSingle(),
    supa.from('household_ticks').select('day, task_id, done, at').eq('household_id', householdId).gte('day', sinceDay),
  ]);
  if (plan.error) throw new Error(plan.error.message);
  if (ticks.error) throw new Error(ticks.error.message);
  return {
    plan: plan.data ? { ...(plan.data.plan as PlanDoc), updatedAt: Number(plan.data.updated_at) } : null,
    ticks: (ticks.data ?? []).map((r) => ({ day: r.day, taskId: r.task_id, done: r.done, at: Number(r.at) })),
  };
}

export async function pushPlan(householdId: string, plan: PlanDoc): Promise<void> {
  const { error } = await db()
    .from('household_plan')
    .upsert({ household_id: householdId, plan, updated_at: plan.updatedAt }, { onConflict: 'household_id' });
  if (error) throw new Error(error.message);
}

export async function pushTicks(householdId: string, ticks: Tick[]): Promise<void> {
  if (!ticks.length) return;
  const rows = ticks.map((t) => ({ household_id: householdId, day: t.day, task_id: t.taskId, done: t.done, at: t.at }));
  const { error } = await db().from('household_ticks').upsert(rows, { onConflict: 'household_id,day,task_id' });
  if (error) throw new Error(error.message);
}

/** Hear other phones' changes live. Returns a function that stops listening. */
export function subscribeFamily(
  householdId: string,
  onPlan: (plan: PlanDoc) => void,
  onTick: (tick: Tick) => void,
): () => void {
  const supa = db();
  const channel: RealtimeChannel = supa
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'household_plan', filter: `household_id=eq.${householdId}` },
      (payload) => {
        const row = payload.new as { plan?: PlanDoc; updated_at?: number };
        if (row?.plan) onPlan({ ...row.plan, updatedAt: Number(row.updated_at) });
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'household_ticks', filter: `household_id=eq.${householdId}` },
      (payload) => {
        const r = payload.new as { day?: string; task_id?: string; done?: boolean; at?: number };
        if (r?.day && r.task_id) onTick({ day: r.day, taskId: r.task_id, done: !!r.done, at: Number(r.at) });
      },
    )
    .subscribe();
  return () => {
    supa.removeChannel(channel);
  };
}

// --- status, for the Settings screen -------------------------------------------------------------

export type SyncStatus =
  | { kind: 'off' }
  | { kind: 'connecting' }
  | { kind: 'live'; lastSync: number }
  | { kind: 'error'; message: string };

let status: SyncStatus = { kind: 'off' };
const listeners = new Set<(s: SyncStatus) => void>();

export function setSyncStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l(status));
}

export function getSyncStatus() {
  return status;
}

export function onSyncStatus(l: (s: SyncStatus) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
