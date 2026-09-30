import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { checkpointSummary, formatTime, planReminders } from './schedule';
import type { AkolState, DayKey } from './types';

export const CHANNEL_ID = 'akol-reminders';
export const TASK_CATEGORY = 'akol-task';
export const ACTION_DONE = 'akol-done';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export interface ReminderData {
  taskId: string;
  day: DayKey;
  checkpoint?: boolean;
}

let configured = false;

/** Call once at startup. Safe to call on web (no-op). */
export async function configureNotifications(): Promise<void> {
  if (!supported || configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Routine reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#E9C46A',
    });
  }

  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: 'Mark done ✓', options: { opensAppToForeground: true } },
  ]);
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!supported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return next.granted;
}

let syncing: Promise<void> = Promise.resolve();

/**
 * Replace every pending Akol reminder with a fresh rolling window.
 * Serialised so rapid check-offs never interleave cancel/schedule calls.
 */
export function syncReminders(state: AkolState): Promise<void> {
  syncing = syncing.then(() => doSync(state)).catch((e) => console.warn('Akol reminders', e));
  return syncing;
}

async function doSync(state: AkolState): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!state.settings.onboarded || !state.settings.notificationsEnabled) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const now = new Date();
  const names = new Map(state.members.map((m) => [m.id, m.name]));

  for (const { task, at, day } of planReminders(state, now)) {
    let title: string;
    let body: string;
    if (task.checkpoint) {
      const summary = checkpointSummary(task, state, state.completions, day);
      const open = summary.outstanding.length;
      title = `${task.title} · ${formatTime(task.time)}`;
      body =
        open === 0
          ? 'Everything is checked off. Off you go ✨'
          : `${task.note ?? 'Have you completed the checklist?'} ${open} item${open === 1 ? '' : 's'} still open.`;
    } else {
      const who = names.get(task.memberId);
      title = who ? `${who} · ${task.title}` : task.title;
      body = task.note ? `${formatTime(task.time)} — ${task.note}` : `It's ${formatTime(task.time)}. Tap to check it off.`;
    }
    const data: ReminderData = { taskId: task.id, day, checkpoint: !!task.checkpoint };
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as unknown as Record<string, unknown>,
        sound: 'default',
        categoryIdentifier: task.checkpoint ? undefined : TASK_CATEGORY,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }
}

export async function sendTestReminder(): Promise<boolean> {
  if (!supported) return false;
  if (!(await requestNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Akol', body: 'This is how your reminders will look. ✨', sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNEL_ID },
  });
  return true;
}

export { Notifications, supported as notificationsSupported };
