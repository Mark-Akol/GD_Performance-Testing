import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime, formatTimeLabel, parseTime } from '@/engine/time';
import { palette, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  label: string;
  /** "HH:mm". */
  value: string;
  onChange: (value: string) => void;
  stepMinutes?: number;
}

/**
 * A stepper rather than a native date picker.
 *
 * `@react-native-community/datetimepicker` renders differently on each
 * platform, needs its own modal handling, and adds a native dependency — for
 * what is only ever a 15-minute-granularity choice. Two buttons and a label
 * behave identically everywhere and stay legible on the dark canvas.
 */
export function TimeField({ label, value, onChange, stepMinutes = 15 }: Props) {
  const shift = (delta: number) => {
    let minutes: number;
    try {
      minutes = parseTime(value);
    } catch {
      minutes = 9 * 60;
    }
    onChange(formatTime(minutes + delta));
  };

  let display: string;
  try {
    display = formatTimeLabel(parseTime(value));
  } catch {
    display = value;
  }

  return (
    <View style={styles.row}>
      <Text variant="label" tone="secondary" style={styles.label}>
        {label}
      </Text>

      <View style={styles.stepper}>
        <Pressable
          onPress={() => shift(-stepMinutes)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${label} earlier`}
          style={styles.step}
        >
          <Ionicons name="remove" size={18} color={palette.textSecondary} />
        </Pressable>

        <Text variant="label" style={styles.value}>
          {display}
        </Text>

        <Pressable
          onPress={() => shift(stepMinutes)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${label} later`}
          style={styles.step}
        >
          <Ionicons name="add" size={18} color={palette.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.xs,
  },
  step: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 78, textAlign: 'center' },
});
