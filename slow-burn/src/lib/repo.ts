import { supabase } from './supabase';
import { localDay, timestampFor } from './dates';
import type {
  Circle,
  CircleStanding,
  DailySummary,
  HabitEvent,
  NudgeKind,
  Profile,
  ReminderDomain,
  ReminderSettings,
  UserGoals,
} from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';

/**
 * All Supabase access lives here.
 *
 * Screens never import the client directly, so the snake_case-to-camelCase
 * translation happens exactly once and a schema change has one place to land.
 */

// ---------------------------------------------------------------------------
// Profile and settings
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, timezone, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    handle: data.handle,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    timezone: data.timezone,
    createdAt: data.created_at,
  };
}

export async function fetchGoals(userId: string): Promise<UserGoals | null> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id,
    goalType: data.goal_type,
    activityLevel: data.activity_level,
    sex: data.sex,
    heightCm: data.height_cm === null ? null : Number(data.height_cm),
    weightKg: data.weight_kg === null ? null : Number(data.weight_kg),
    // Postgres returns `time` as "HH:MM:SS"; the engine wants "HH:mm".
    wakeTime: trimTime(data.wake_time),
    sleepTime: trimTime(data.sleep_time),
    workStart: trimTime(data.work_start),
    workEnd: trimTime(data.work_end),
    trainingDays: data.training_days,
    dietaryPattern: data.dietary_pattern,
    allergies: data.allergies ?? [],
  };
}

export async function saveGoals(userId: string, goals: Partial<UserGoals>): Promise<void> {
  const patch: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  if (goals.goalType !== undefined) patch.goal_type = goals.goalType;
  if (goals.activityLevel !== undefined) patch.activity_level = goals.activityLevel;
  if (goals.sex !== undefined) patch.sex = goals.sex;
  if (goals.heightCm !== undefined) patch.height_cm = goals.heightCm;
  if (goals.weightKg !== undefined) patch.weight_kg = goals.weightKg;
  if (goals.wakeTime !== undefined) patch.wake_time = goals.wakeTime;
  if (goals.sleepTime !== undefined) patch.sleep_time = goals.sleepTime;
  if (goals.workStart !== undefined) patch.work_start = goals.workStart;
  if (goals.workEnd !== undefined) patch.work_end = goals.workEnd;
  if (goals.trainingDays !== undefined) patch.training_days = goals.trainingDays;
  if (goals.dietaryPattern !== undefined) patch.dietary_pattern = goals.dietaryPattern;
  if (goals.allergies !== undefined) patch.allergies = goals.allergies;

  const { error } = await supabase.from('user_goals').upsert(patch, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchReminderSettings(userId: string): Promise<ReminderSettings[]> {
  const { data, error } = await supabase.from('reminder_settings').select('*').eq('user_id', userId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    domain: row.domain as ReminderDomain,
    mode: row.mode,
    enabled: row.enabled,
    presetTimes: (row.preset_times ?? []).map(trimTime),
    config: row.config ?? {},
  }));
}

export async function saveReminderSetting(
  userId: string,
  domain: ReminderDomain,
  patch: Partial<Pick<ReminderSettings, 'mode' | 'enabled' | 'presetTimes' | 'config'>>,
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    domain,
    updated_at: new Date().toISOString(),
  };
  if (patch.mode !== undefined) row.mode = patch.mode;
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.presetTimes !== undefined) row.preset_times = patch.presetTimes;
  if (patch.config !== undefined) row.config = patch.config;

  const { error } = await supabase
    .from('reminder_settings')
    .upsert(row, { onConflict: 'user_id,domain' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// The day
// ---------------------------------------------------------------------------

/**
 * Write today's plan into habit_events, then read the day back.
 *
 * The upsert keys on (user_id, local_day, item_key) and ignores conflicts, so
 * re-planning a day the user is halfway through adds any genuinely new items
 * without resetting the ones they have already ticked off.
 */
export async function syncDayEvents(
  userId: string,
  items: ScheduledItem[],
  date: Date = new Date(),
): Promise<HabitEvent[]> {
  const day = localDay(date);

  if (items.length > 0) {
    const rows = items.map((item) => ({
      user_id: userId,
      domain: item.domain,
      local_day: day,
      item_key: item.key,
      scheduled_for: timestampFor(item.minuteOfDay, date).toISOString(),
      payload: item.payload,
    }));

    const { error } = await supabase
      .from('habit_events')
      .upsert(rows, { onConflict: 'user_id,local_day,item_key', ignoreDuplicates: true });
    if (error) throw error;
  }

  return fetchDayEvents(userId, day);
}

export async function fetchDayEvents(userId: string, day = localDay()): Promise<HabitEvent[]> {
  const { data, error } = await supabase
    .from('habit_events')
    .select('*')
    .eq('user_id', userId)
    .eq('local_day', day)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    domain: row.domain as ReminderDomain,
    scheduledFor: row.scheduled_for,
    status: row.status,
    completedAt: row.completed_at,
    payload: row.payload ?? {},
  }));
}

export async function setEventStatus(
  eventId: string,
  status: 'done' | 'skipped' | 'pending',
): Promise<void> {
  const { error } = await supabase
    .from('habit_events')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', eventId);
  if (error) throw error;
}

export async function fetchSummary(userId: string, day = localDay()): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('local_day', day)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id,
    day: data.local_day,
    completed: data.completed,
    total: data.total,
    score: data.score,
    streak: data.streak,
  };
}

// ---------------------------------------------------------------------------
// Circles
// ---------------------------------------------------------------------------

export async function fetchCircles(): Promise<Circle[]> {
  const { data, error } = await supabase
    .from('circles')
    .select('id, name, invite_code, owner_id, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }));
}

export async function createCircle(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_circle', { circle_name: name });
  if (error) throw error;
  return data as string;
}

export async function joinCircle(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_circle_with_code', { code });
  if (error) throw error;
  return data as string;
}

export async function leaveCircle(circleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchStandings(
  circleId: string,
  day = localDay(),
): Promise<CircleStanding[]> {
  const { data, error } = await supabase.rpc('circle_standings', {
    target_circle: circleId,
    target_day: day,
  });
  if (error) throw error;

  // The RPC returns snake_case columns; give them a shape so the mapping below
  // is checked rather than silently typed as `any`.
  type StandingRow = {
    user_id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    score: number;
    completed: number;
    total: number;
    streak: number;
  };

  return ((data ?? []) as StandingRow[]).map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    score: row.score,
    completed: row.completed,
    total: row.total,
    streak: row.streak,
  }));
}

export async function sendNudge(params: {
  circleId: string;
  fromUserId: string;
  toUserId: string;
  kind: NudgeKind;
  message?: string;
}): Promise<void> {
  const { error } = await supabase.from('nudges').insert({
    circle_id: params.circleId,
    from_user_id: params.fromUserId,
    to_user_id: params.toUserId,
    kind: params.kind,
    message: params.message ?? null,
  });
  if (error) throw error;
}

function trimTime(value: string): string {
  return value.slice(0, 5);
}
