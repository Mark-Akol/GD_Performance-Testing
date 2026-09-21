import { palette } from './tokens';
import type { ReminderDomain } from '@/types/models';

type DomainMeta = {
  label: string;
  /** Second-person verb shown on the action card. */
  action: string;
  color: string;
  /** @expo/vector-icons Ionicons name. */
  icon: string;
};

export const DOMAIN_META: Record<ReminderDomain, DomainMeta> = {
  hydration: { label: 'Hydration', action: 'Drink', color: palette.hydration, icon: 'water-outline' },
  nutrition: { label: 'Nutrition', action: 'Eat', color: palette.nutrition, icon: 'restaurant-outline' },
  movement: { label: 'Movement', action: 'Walk', color: palette.movement, icon: 'walk-outline' },
  screen_break: { label: 'Screen break', action: 'Look away', color: palette.screen, icon: 'eye-outline' },
  training: { label: 'Training', action: 'Train', color: palette.training, icon: 'barbell-outline' },
};
