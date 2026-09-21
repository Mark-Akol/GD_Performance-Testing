import { create } from 'zustand';
import { planDay } from '@/engine/planDay';
import { localDay, localDayOfWeek } from '@/lib/dates';
import { syncScheduledReminders } from '@/lib/notifications';
import { fetchSummary, setEventStatus, syncDayEvents } from '@/lib/repo';
import type { DailySummary, HabitEvent, ReminderSettings, UserGoals } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';

interface DayState {
  day: string;
  items: ScheduledItem[];
  events: HabitEvent[];
  summary: DailySummary | null;
  loading: boolean;
  error: string | null;

  load: (userId: string, goals: UserGoals, settings: ReminderSettings[]) => Promise<void>;
  complete: (userId: string, eventId: string) => Promise<void>;
  skip: (userId: string, eventId: string) => Promise<void>;
}

export const useDay = create<DayState>((set, get) => ({
  day: localDay(),
  items: [],
  events: [],
  summary: null,
  loading: false,
  error: null,

  load: async (userId, goals, settings) => {
    set({ loading: true, error: null });
    try {
      const now = new Date();
      const day = localDay(now);

      // The plan is computed locally first, so the Today screen can render a
      // full day even on a cold start with no network.
      const plan = planDay({ goals, settings, day, dayOfWeek: localDayOfWeek(now) });
      set({ day, items: plan.items });

      const events = await syncDayEvents(userId, plan.items, now);
      const summary = await fetchSummary(userId, day);
      set({ events, summary });

      await syncScheduledReminders(plan.items, now);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load today' });
    } finally {
      set({ loading: false });
    }
  },

  complete: async (userId, eventId) => {
    await applyStatus(set, get, userId, eventId, 'done');
  },

  skip: async (userId, eventId) => {
    await applyStatus(set, get, userId, eventId, 'skipped');
  },
}));

/**
 * Optimistic update: the tick lands instantly and rolls back if the write
 * fails. Ticking off a habit is the app's core interaction — it must never
 * feel like it is waiting on a server.
 */
async function applyStatus(
  set: (partial: Partial<DayState>) => void,
  get: () => DayState,
  userId: string,
  eventId: string,
  status: 'done' | 'skipped',
): Promise<void> {
  const previous = get().events;
  const optimistic = previous.map((e) =>
    e.id === eventId
      ? { ...e, status, completedAt: status === 'done' ? new Date().toISOString() : null }
      : e,
  );
  set({ events: optimistic });

  try {
    await setEventStatus(eventId, status);
    // The summary is recomputed by a database trigger, so read it back rather
    // than trying to mirror the scoring rules on the client.
    const summary = await fetchSummary(userId, get().day);
    set({ summary });
  } catch (err) {
    set({
      events: previous,
      error: err instanceof Error ? err.message : 'Could not save that',
    });
  }
}
