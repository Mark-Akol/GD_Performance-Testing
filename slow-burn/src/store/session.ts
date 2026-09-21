import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchGoals, fetchProfile, fetchReminderSettings } from '@/lib/repo';
import { registerForPush } from '@/lib/notifications';
import type { Profile, ReminderSettings, UserGoals } from '@/types/models';

interface SessionState {
  /** null = signed out, undefined = not yet determined. */
  session: Session | null | undefined;
  profile: Profile | null;
  goals: UserGoals | null;
  settings: ReminderSettings[];
  loading: boolean;

  /** Subscribes to auth changes. Returns an unsubscribe fn. */
  init: () => () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  session: undefined,
  profile: null,
  goals: null,
  settings: [],
  loading: false,

  init: () => {
    void supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session });
      if (data.session) void get().refresh();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        void get().refresh();
      } else {
        set({ profile: null, goals: null, settings: [] });
      }
    });

    return () => sub.subscription.unsubscribe();
  },

  refresh: async () => {
    const session = get().session;
    if (!session) return;

    set({ loading: true });
    try {
      const [profile, goals, settings] = await Promise.all([
        fetchProfile(session.user.id),
        fetchGoals(session.user.id),
        fetchReminderSettings(session.user.id),
      ]);
      set({ profile, goals, settings });

      // Fire and forget: push is for nudges only, so a failure here must not
      // stop the user reaching the Today screen.
      void registerForPush(session.user.id);
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, goals: null, settings: [] });
  },
}));

/**
 * Onboarding is complete once the user has told us enough to build a coached
 * plan. Weight drives the hydration target, so it stands in for "we have
 * their numbers".
 */
export function needsOnboarding(goals: UserGoals | null): boolean {
  return !goals || goals.weightKg === null;
}
