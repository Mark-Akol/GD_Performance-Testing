import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { palette } from '@/theme/tokens';
import { DOMAIN_META } from '@/theme/domains';
import type { ScheduledItem } from '@/types/schedule';
import { supabase } from './supabase';

/**
 * Notification strategy, and the single biggest reason this app is cheap to
 * run: every habit reminder is a LOCAL notification scheduled on the device.
 *
 * The alternative — a server cron waking up to push five reminders a day to
 * every user — costs money per user per day, needs uptime monitoring, and
 * fails silently when a worker dies. Local notifications cost nothing, fire
 * without a network, and survive the backend being down entirely.
 *
 * Remote push is used only for the social layer (a friend nudging you), which
 * genuinely cannot originate on your own device.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** iOS caps pending local notifications at 64. Stay well inside it. */
const MAX_PENDING = 56;

export async function ensurePermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: palette.ember,
      vibrationPattern: [0, 200],
    });
    await Notifications.setNotificationChannelAsync('social', {
      name: 'From your circle',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: palette.brass,
      vibrationPattern: [0, 200, 100, 200],
    });
  }

  return status === 'granted';
}

/**
 * Replace all scheduled reminders with the given plan.
 *
 * Cancel-then-reschedule rather than diffing: the plan for a single day is
 * small, and a diff that drifts out of sync produces either duplicate buzzes
 * or silent gaps — both far worse than a few milliseconds of extra work.
 */
export async function syncScheduledReminders(
  items: ScheduledItem[],
  day: Date = new Date(),
): Promise<number> {
  const granted = await ensurePermissions();
  if (!granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let scheduled = 0;

  for (const item of items) {
    if (scheduled >= MAX_PENDING) break;

    const fireAt = new Date(day);
    fireAt.setHours(0, 0, 0, 0);
    fireAt.setMinutes(item.minuteOfDay);

    // Skip anything already in the past — rescheduling mid-day should not
    // fire a burst of catch-up notifications for prompts you already handled.
    if (fireAt.getTime() <= now) continue;

    const meta = DOMAIN_META[item.domain];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${meta.action} — ${item.title}`,
        body: item.detail,
        data: { domain: item.domain, itemKey: item.key },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    scheduled += 1;
  }

  return scheduled;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Register this device for remote push (nudges only) and store the token.
 * Silently does nothing on a simulator, which cannot receive push.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const granted = await ensurePermissions();
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );

    return token;
  } catch {
    // A failed push registration must never block sign-in; local reminders
    // (the core of the product) work regardless.
    return null;
  }
}
