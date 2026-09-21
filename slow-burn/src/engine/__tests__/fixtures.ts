import type { ReminderDomain, ReminderSettings, UserGoals } from '@/types/models';
import { REMINDER_DOMAINS } from '@/types/models';

export function goals(overrides: Partial<UserGoals> = {}): UserGoals {
  return {
    userId: 'u1',
    goalType: 'general_health',
    activityLevel: 'moderate',
    sex: 'unspecified',
    heightCm: 175,
    weightKg: 80,
    wakeTime: '06:30',
    sleepTime: '22:30',
    workStart: '09:00',
    workEnd: '17:30',
    trainingDays: 3,
    dietaryPattern: 'omnivore',
    allergies: [],
    ...overrides,
  };
}

export function setting(
  domain: ReminderDomain,
  overrides: Partial<ReminderSettings> = {},
): ReminderSettings {
  return {
    userId: 'u1',
    domain,
    mode: 'coached',
    enabled: true,
    presetTimes: [],
    config: {},
    ...overrides,
  };
}

/** Every domain enabled in coached mode. */
export function allCoached(): ReminderSettings[] {
  return REMINDER_DOMAINS.map((d) => setting(d));
}
