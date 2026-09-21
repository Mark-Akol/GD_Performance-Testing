import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DOMAIN_META } from '@/theme/domains';
import { palette, radius, spacing } from '@/theme/tokens';
import { formatTimeLabel } from '@/engine/time';
import type { EventStatus, ReminderDomain } from '@/types/models';
import { Text } from './Text';

interface Props {
  domain: ReminderDomain;
  title: string;
  detail: string;
  minuteOfDay: number;
  status: EventStatus;
  /** Marks the single item the user should do next. */
  isNext?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function ActionRow({
  domain,
  title,
  detail,
  minuteOfDay,
  status,
  isNext = false,
  onComplete,
  onSkip,
}: Props) {
  const meta = DOMAIN_META[domain];
  const done = status === 'done';
  const skipped = status === 'skipped';

  const handleComplete = () => {
    if (done) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  return (
    <View
      style={[styles.row, isNext && styles.next, (done || skipped) && styles.settled]}
      accessible
      accessibilityLabel={`${meta.label}: ${title}, ${detail}, at ${formatTimeLabel(minuteOfDay)}`}
    >
      <View style={[styles.glyph, { backgroundColor: `${meta.color}1F` }]}>
        <Ionicons name={meta.icon as never} size={20} color={meta.color} />
      </View>

      <View style={styles.body}>
        <View style={styles.headline}>
          <Text variant="label" tone={done ? 'tertiary' : 'primary'}>
            {title}
          </Text>
          <Text variant="caption" tone="tertiary">
            {formatTimeLabel(minuteOfDay)}
          </Text>
        </View>
        <Text
          variant="caption"
          tone={done ? 'tertiary' : 'secondary'}
          style={done ? styles.struck : undefined}
          numberOfLines={2}
        >
          {detail}
        </Text>
      </View>

      <View style={styles.actions}>
        {!done && !skipped ? (
          <Pressable
            onPress={onSkip}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${title}`}
            style={styles.skip}
          >
            <Ionicons name="close" size={16} color={palette.textTertiary} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleComplete}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Mark ${title} done`}
          style={[styles.check, done && styles.checkDone]}
        >
          <Ionicons
            name="checkmark"
            size={18}
            color={done ? palette.void : palette.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  next: { backgroundColor: palette.surfaceRaised, borderColor: palette.emberDim },
  settled: { opacity: 0.55 },
  glyph: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  headline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  struck: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  skip: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  checkDone: { backgroundColor: palette.ember, borderColor: palette.ember },
});
